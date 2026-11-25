/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type FC, useCallback, useEffect, useMemo, memo, useState } from 'react';
import { isEqual } from 'lodash';
import useDebounce from 'react-use/lib/useDebounce';
import {
  useForm,
  useFormData,
  Form,
  UseField,
  useFormContext,
  type FormHook,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { EuiButton, EuiFlexGroup, EuiSpacer } from '@elastic/eui';

import { TextAreaField, SuperSelectField } from '@kbn/es-ui-shared-plugin/static/forms/components';

import {
  MAX_OBSERVABLE_VALUE_LENGTH,
  OBSERVABLE_TYPES_BUILTIN,
  SEARCH_DEBOUNCE_MS,
} from '../../../common/constants';
import type {
  ObservableMetadata,
  ObservablePatch,
  ObservablePost,
  ObservableWithMetadata,
} from '../../../common/types/api';
import type { Observable } from '../../../common/types/domain';
import { useGetCaseConfiguration } from '../../containers/configure/use_get_case_configuration';
import { useGetObservableMetadata } from '../../containers/use_get_observable_metadata';
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
  caseId: string;
  isLoading: boolean;
  onSubmit: (observable: ObservablePatch | ObservablePost) => Promise<void>;
  observable?: ObservableWithMetadata;
  onCancel: VoidFunction;
}

type ObservableFormData = Omit<ObservablePost, 'metadata'> & {
  [METADATA_PAIRS_PATH]?: MetadataPair[];
};

/** A value and the shared metadata it holds. */
interface MetadataOfValue {
  value: string;
  metadata: ObservableMetadata;
}

const canLookUpMetadata = (value: string): boolean =>
  value.length > 0 && value.length <= MAX_OBSERVABLE_VALUE_LENGTH;

/**
 * While an observable is edited, keeps the metadata rows on the shared metadata of the value in
 * the form: a new value loads its own metadata, so an edit replaces that metadata with what the
 * user sees rather than with the old value's. Returns the metadata the rows were loaded from and
 * whether the rows are waiting for the value's metadata.
 */
const useMetadataOfFormValue = ({
  form,
  caseId,
  observable,
  initialMetadata,
}: {
  form: FormHook<ObservableFormData>;
  caseId: string;
  observable?: ObservableWithMetadata;
  initialMetadata: ObservableMetadata;
}): { metadataOfValue: ObservableMetadata; isLoadingMetadata: boolean } => {
  const isEdit = observable != null;
  const [shown, setShown] = useState<MetadataOfValue>({
    value: observable?.value ?? '',
    metadata: initialMetadata,
  });

  const [{ value: formValue = '' }] = useFormData<ObservableFormData>({ form, watch: 'value' });
  const [debouncedValue, setDebouncedValue] = useState(formValue);
  useDebounce(() => setDebouncedValue(formValue), SEARCH_DEBOUNCE_MS, [formValue]);

  const isOriginalValue = debouncedValue === observable?.value;
  const { data } = useGetObservableMetadata(
    caseId,
    { typeKey: observable?.typeKey ?? '', value: debouncedValue },
    { enabled: isEdit && !isOriginalValue && canLookUpMetadata(debouncedValue) }
  );
  const loadedMetadata = isOriginalValue ? initialMetadata : data?.metadata;

  useEffect(() => {
    // Rows are replaced once per value, so a refetch of the same value keeps the user's edits.
    if (!isEdit || loadedMetadata == null || debouncedValue === shown.value) {
      return;
    }

    setShown({ value: debouncedValue, metadata: loadedMetadata });
    form.updateFieldValues({ [METADATA_PAIRS_PATH]: metadataToPairs(loadedMetadata) });
  }, [debouncedValue, form, isEdit, loadedMetadata, shown.value]);

  return {
    metadataOfValue: shown.metadata,
    isLoadingMetadata: isEdit && canLookUpMetadata(formValue) && formValue !== shown.value,
  };
};

export const ObservableForm: FC<ObservableFormProps> = ({
  caseId,
  isLoading,
  onSubmit,
  observable,
  onCancel,
}) => {
  // The rows are built once from the observable; after that only a value change replaces them.
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

  const { metadataOfValue, isLoadingMetadata } = useMetadataOfFormValue({
    form,
    caseId,
    observable,
    initialMetadata,
  });

  const handleSubmitClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      const { isValid, data } = await form.submit(e);

      if (!isValid) {
        return;
      }

      const { [METADATA_PAIRS_PATH]: pairs, ...fields } = data;
      const metadata = pairsToMetadata(pairs);
      // An add sends metadata when there is some. An edit sends it only when it differs from the
      // metadata the (new) value holds, which it then replaces; `{}` clears it.
      const sendMetadata = observable
        ? !isEqual(metadata, metadataOfValue)
        : Object.keys(metadata).length > 0;

      return onSubmit({
        ...fields,
        ...(sendMetadata && { metadata }),
      } as ObservablePatch | ObservablePost);
    },
    [form, metadataOfValue, observable, onSubmit]
  );

  return (
    <Form form={form}>
      <ObservableFormFields observable={observable} />
      <EuiSpacer size="m" />
      <ObservableMetadataFields isLoading={isLoadingMetadata} />
      <EuiSpacer size="m" />

      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiButton onClick={onCancel}>{i18n.CANCEL}</EuiButton>

        <EuiButton
          data-test-subj="save-observable"
          onClick={handleSubmitClick}
          isLoading={isLoading}
          isDisabled={isLoadingMetadata}
        >
          {observable ? i18n.SAVE_OBSERVABLE : i18n.ADD_OBSERVABLE}
        </EuiButton>
      </EuiFlexGroup>
    </Form>
  );
};

ObservableForm.displayName = 'ObservableForm';
