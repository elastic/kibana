/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiCallOut, EuiSkeletonText, EuiText } from '@elastic/eui';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { useRecord, useUpdateRecord } from '../../hooks';
import { AutosaveFieldsForm } from '../fields/autosave_fields_form';
import type { SaveFieldHandlers } from '../fields/autosave_fields_form';
import { useTypeFields } from '../fields/use_type_fields';
import * as fieldsI18n from '../fields/translations';
import { SideCard } from './side_card';
import * as i18n from './translations';

interface TypeFieldsProps {
  recordId: string;
  template: { id: string; version: number };
  extendedFields: Record<string, string>;
}

/** The fields of the record's Cases template, read from `case.extended_fields`. */
const TypeFields: React.FC<TypeFieldsProps> = ({ recordId, template, extendedFields }) => {
  const { fields, isLoading, isError } = useTypeFields(template.id, template.version);
  const { mutate: updateRecord } = useUpdateRecord(recordId, { silentErrors: true });

  const saveField = useCallback(
    (key: string, value: string, { onSuccess, onError }: SaveFieldHandlers) =>
      updateRecord({ extended_fields: { [key]: value } }, { onSuccess, onError }),
    [updateRecord]
  );

  if (isLoading) {
    return <EuiSkeletonText lines={3} aria-label={fieldsI18n.FIELDS_LOADING} />;
  }
  if (isError) {
    return (
      <EuiCallOut
        announceOnMount
        size="s"
        color="danger"
        title={fieldsI18n.FIELDS_ERROR}
        data-test-subj="investigationFieldsError"
      />
    );
  }
  if (fields.length === 0) {
    return (
      <EuiText size="s" color="subdued" data-test-subj="investigationFieldsNone">
        {i18n.FIELDS_NONE}
      </EuiText>
    );
  }
  return <AutosaveFieldsForm fields={fields} values={extendedFields} onSaveField={saveField} />;
};
TypeFields.displayName = 'TypeFields';

export interface FieldsCardProps {
  record: InvestigationRecord;
}

/** The form fields of the record's investigation type. The type itself changes in Take action. */
export const FieldsCard: React.FC<FieldsCardProps> = ({ record }) => {
  const { data, isLoading, isError } = useRecord(record.id);
  const theCase = data?.case;
  const template = theCase?.template ?? null;

  return (
    <SideCard
      title={i18n.FIELDS}
      action={
        record.investigation_type ? (
          <EuiText size="xs" color="subdued" data-test-subj="investigationFieldsTypeName">
            {record.investigation_type}
          </EuiText>
        ) : undefined
      }
      data-test-subj="investigationFieldsCard"
    >
      {isLoading ? (
        <EuiSkeletonText lines={3} aria-label={fieldsI18n.FIELDS_LOADING} />
      ) : isError || !theCase ? (
        <EuiCallOut
          announceOnMount
          size="s"
          color="danger"
          title={fieldsI18n.FIELDS_ERROR}
          data-test-subj="investigationFieldsError"
        />
      ) : template ? (
        <TypeFields
          key={`${template.id}:${template.version}`}
          recordId={record.id}
          template={template}
          extendedFields={theCase.extended_fields}
        />
      ) : (
        <EuiText size="s" color="subdued" data-test-subj="investigationFieldsNoType">
          {i18n.FIELDS_NO_TYPE}
        </EuiText>
      )}
    </SideCard>
  );
};
FieldsCard.displayName = 'FieldsCard';
