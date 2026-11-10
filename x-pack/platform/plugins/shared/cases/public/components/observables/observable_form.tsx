/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useCallback, useMemo, memo, useState } from 'react';
import { isEqual } from 'lodash';
import {
  useForm,
  Form,
  UseField,
  useFormContext,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { EuiButton, EuiFlexGroup, EuiSpacer } from '@elastic/eui';

import { TextAreaField, SuperSelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';

import { OBSERVABLE_TYPES_BUILTIN } from '../../../common/constants';
import type {
  ObservablePatch,
  ObservablePost,
  ObservableWithMetadata,
} from '../../../common/types/api';
import type { Observable } from '../../../common/types/domain';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import * as i18n from './translations';
import { fieldsConfig, normalizeValueType } from './fields_config';
import { getDynamicValueField } from './builder';
import type { MetadataPair } from './observable_metadata_fields';
import {
  METADATA_PAIRS_PATH,
  ObservableMetadataFields,
  metadataToPairs,
  pairsToMetadata,
} from './observable_metadata_fields';

export interface ObservableFormFieldsProps {
  observable?: Observable;
}

export const ObservableFormFields = memo(({ observable }: ObservableFormFieldsProps) => {
  const { data, isLoading } = useGetCaseConfiguration();
  const [selectedTypeKey, setSelectedTypeKey] = useState<string>(observable?.typeKey ?? '');

  const { validateFields } = useFormContext();

  const options = useMemo(() => {
    return [...OBSERVABLE_TYPES_BUILTIN, ...data.observableTypes].map((observableType) => ({
      value: observableType.key,
      inputDisplay: observableType.label,
    }));
  }, [data.observableTypes]);

  const handleSelectedTypeChange = useCallback(
    (selectedTypeKeyValue: string) => {
      validateFields(['value']);
      setSelectedTypeKey(selectedTypeKeyValue);
    },
    [validateFields]
  );

  // NOTE: dynamic, because of field config changes, depending on the selectedTypeKey
  const ValueComponent = useMemo(
    () => getDynamicValueField(normalizeValueType(selectedTypeKey)),
    [selectedTypeKey]
  );

  return (
    <>
      {!observable && (
        <UseField
          component={SuperSelectField}
          componentProps={{
            euiFieldProps: {
              options,
              isLoading,
              'data-test-subj': 'observable-type-select',
              placeholder: i18n.SELECT_OBSERVABLE_TYPE_PLACEHOLDER,
            },
          }}
          onChange={handleSelectedTypeChange}
          path="typeKey"
          config={fieldsConfig.typeKey}
        />
      )}
      <ValueComponent />
      <UseField
        path="description"
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'observable-description-text-area',
            placeholder: i18n.SELECT_OBSERVABLE_DESCRIPTION_PLACEHOLDER,
          },
        }}
        config={fieldsConfig.description}
        component={TextAreaField}
      />
    </>
  );
});
ObservableFormFields.displayName = 'ObservableFormFields';

export interface ObservableFormProps {
  isLoading: boolean;
  onSubmit: (observable: ObservablePatch | ObservablePost) => Promise<void>;
  observable?: ObservableWithMetadata;
  onCancel: VoidFunction;
}

type ObservableFormData = Omit<ObservablePost, 'metadata'> & {
  [METADATA_PAIRS_PATH]?: MetadataPair[];
};

export const ObservableForm: FC<ObservableFormProps> = ({
  isLoading,
  onSubmit,
  observable,
  onCancel,
}) => {
  // The rows are built once, so editing does not reset them (UseArray keeps its own copy).
  const initialMetadata = useMemo(() => observable?.metadata ?? {}, [observable?.metadata]);
  const defaultValue = useMemo(
    () => ({
      ...(observable ?? { typeKey: '', value: '', description: '' }),
      [METADATA_PAIRS_PATH]: metadataToPairs(initialMetadata),
    }),
    [initialMetadata, observable]
  );

  const { form } = useForm<ObservableFormData>({
    defaultValue: defaultValue as ObservableFormData,
    options: { stripEmptyFields: false },
  });

  const handleSubmitClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      const { isValid, data } = await form.submit(e);

      if (!isValid) {
        return;
      }

      const { [METADATA_PAIRS_PATH]: pairs, ...fields } = data;
      const metadata = pairsToMetadata(pairs);
      // An add sends metadata when there is some. An edit sends it only when it changed, so a
      // value edit does not copy the old value's metadata onto the new value; `{}` clears it.
      const sendMetadata = observable
        ? !isEqual(metadata, initialMetadata)
        : Object.keys(metadata).length > 0;

      return onSubmit({
        ...fields,
        ...(sendMetadata && { metadata }),
      } as ObservablePatch | ObservablePost);
    },
    [form, initialMetadata, observable, onSubmit]
  );

  return (
    <Form form={form}>
      <ObservableFormFields observable={observable} />
      <EuiSpacer size="m" />
      <ObservableMetadataFields />
      <EuiSpacer size="m" />

      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiButton onClick={onCancel}>{i18n.CANCEL}</EuiButton>

        <EuiButton
          data-test-subj="save-observable"
          onClick={handleSubmitClick}
          isLoading={isLoading}
        >
          {observable ? i18n.SAVE_OBSERVABLE : i18n.ADD_OBSERVABLE}
        </EuiButton>
      </EuiFlexGroup>
    </Form>
  );
};

ObservableForm.displayName = 'ObservableForm';
