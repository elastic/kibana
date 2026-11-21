/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MutableRefObject } from 'react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import { isDisplayOnlyField } from '../../../../common/types/domain/template/fields';
import { useRecord } from '../../hooks';
import { ExtendedFieldsForm } from '../fields/extended_fields_form';
import type { ExtendedFieldsFormApi } from '../fields/extended_fields_form';
import { getFieldKey, isEmptyFieldValue, isFieldVisible } from '../fields/field_utils';
import { useTypeFields } from '../fields/use_type_fields';
import * as i18n from './translations';

/** Fields the close needs: required on close, shown by their conditions and still empty. */
const getMissingCloseFields = (
  fields: InlineField[],
  values: Record<string, string>
): InlineField[] =>
  fields
    .filter(
      (field) =>
        field.validation?.required_on_close === true &&
        !isDisplayOnlyField(field) &&
        isEmptyFieldValue(values[getFieldKey(field)]) &&
        isFieldVisible(field, fields, values)
    )
    // Cases checks required-on-close on the server; here the field must be filled to continue.
    .map((field) => ({ ...field, validation: { ...field.validation, required: true } }));

interface RequiredFieldsFormProps {
  fields: InlineField[];
  missing: InlineField[];
  values: Record<string, string>;
  formApiRef: MutableRefObject<ExtendedFieldsFormApi | null>;
}

/** Publishes only the values of the drawn fields, which are the ones the close request needs. */
const RequiredFieldsForm: React.FC<RequiredFieldsFormProps> = ({
  fields,
  missing,
  values,
  formApiRef,
}) => {
  const innerRef = useRef<ExtendedFieldsFormApi | null>(null);
  const missingKeys = useMemo(() => missing.map(getFieldKey), [missing]);

  useEffect(() => {
    formApiRef.current = {
      trigger: async () => (await innerRef.current?.trigger()) ?? true,
      getValues: () => {
        const all = innerRef.current?.getValues() ?? {};
        return Object.fromEntries(missingKeys.map((key) => [key, all[key]]));
      },
      showServerErrors: (errors) => innerRef.current?.showServerErrors(errors) ?? [],
    };
    return () => {
      formApiRef.current = null;
    };
  }, [formApiRef, missingKeys]);

  return (
    <ExtendedFieldsForm
      fields={fields}
      renderedFields={missing}
      initialValues={values}
      formApiRef={innerRef}
    />
  );
};
RequiredFieldsForm.displayName = 'RequiredFieldsForm';

export interface CloseRequiredFieldsProps {
  recordId: string;
  formApiRef: MutableRefObject<ExtendedFieldsFormApi | null>;
  /** True until the template and the saved values are loaded and the missing fields are known. */
  onLoadingChange: (isLoading: boolean) => void;
}

/**
 * The close-required fields of the investigation's type that are still empty, drawn with the Cases
 * field components so they can be filled in place. The list is fixed when the modal opens, so a
 * field does not vanish while it is being filled.
 */
export const CloseRequiredFields: React.FC<CloseRequiredFieldsProps> = ({
  recordId,
  formApiRef,
  onLoadingChange,
}) => {
  const { data, isLoading: isLoadingRecord } = useRecord(recordId);
  const template = data?.case.template ?? null;
  const { fields, isLoading: isLoadingFields } = useTypeFields(template?.id, template?.version);
  const [missing, setMissing] = useState<InlineField[] | null>(null);

  const isLoading = isLoadingRecord || isLoadingFields;
  const values = data?.case.extended_fields;

  useEffect(() => {
    if (missing === null && !isLoading && values) {
      setMissing(getMissingCloseFields(fields, values));
    }
  }, [missing, isLoading, fields, values]);

  useEffect(() => {
    onLoadingChange(missing === null);
  }, [missing, onLoadingChange]);

  if (!missing || missing.length === 0 || !values) {
    return null;
  }

  return (
    <div data-test-subj="investigationCloseRequiredFields">
      <EuiTitle size="xxs">
        <h3>{i18n.CLOSE_FIELDS_TITLE}</h3>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        {i18n.CLOSE_FIELDS_HELP}
      </EuiText>
      <EuiSpacer size="s" />
      <RequiredFieldsForm
        fields={fields}
        missing={missing}
        values={values}
        formApiRef={formApiRef}
      />
      <EuiSpacer size="m" />
    </div>
  );
};
CloseRequiredFields.displayName = 'CloseRequiredFields';
