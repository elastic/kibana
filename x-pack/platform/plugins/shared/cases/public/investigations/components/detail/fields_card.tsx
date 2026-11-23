/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiCallOut, EuiSkeletonText, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import type { InlineField } from '../../../../common/types/domain/template/fields';
import type { InvestigationRecord } from '../../../../common/investigations/types';
import { useRecord, useUpdateRecord } from '../../hooks';
import { AutosaveFieldsForm } from '../fields/autosave_fields_form';
import type { SaveFieldHandlers } from '../fields/autosave_fields_form';
import { useGlobalFields } from '../fields/use_global_fields';
import { useTypeFields } from '../fields/use_type_fields';
import * as fieldsI18n from '../fields/translations';
import { SideCard } from './side_card';
import * as i18n from './translations';

type SaveField = (key: string, value: string, handlers: SaveFieldHandlers) => void;

interface TypeFieldsProps {
  template: { id: string; version: number };
  extendedFields: Record<string, string>;
  saveField: SaveField;
  /** Names the group when the global fields are shown above it. */
  title?: string;
}

/** The fields of the record's Cases template, read from `case.extended_fields`. */
const TypeFields: React.FC<TypeFieldsProps> = ({ template, extendedFields, saveField, title }) => {
  const { fields, isLoading, isError } = useTypeFields(template.id, template.version);

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
  return (
    <div data-test-subj="investigationTemplateFields">
      {title ? (
        <>
          <EuiTitle size="xxs">
            <h3>{title}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
        </>
      ) : null}
      <AutosaveFieldsForm fields={fields} values={extendedFields} onSaveField={saveField} />
    </div>
  );
};
TypeFields.displayName = 'TypeFields';

interface GlobalFieldsGroupProps {
  fields: InlineField[];
  extendedFields: Record<string, string>;
  saveField: SaveField;
}

/** The global fields of the owner: they apply to every investigation, with or without a template. */
const GlobalFieldsGroup: React.FC<GlobalFieldsGroupProps> = ({
  fields,
  extendedFields,
  saveField,
}) => (
  <div data-test-subj="investigationGlobalFields">
    <EuiTitle size="xxs">
      <h3>{fieldsI18n.GLOBAL_FIELDS_TITLE}</h3>
    </EuiTitle>
    <EuiSpacer size="s" />
    <AutosaveFieldsForm fields={fields} values={extendedFields} onSaveField={saveField} />
  </div>
);
GlobalFieldsGroup.displayName = 'GlobalFieldsGroup';

export interface FieldsCardProps {
  record: InvestigationRecord;
}

/**
 * The form fields of the record: the global fields first, then those of its template. The
 * template itself changes in Take action; global fields belong to no template.
 */
export const FieldsCard: React.FC<FieldsCardProps> = ({ record }) => {
  const { data, isLoading, isError } = useRecord(record.id);
  const theCase = data?.case;
  const template = theCase?.template ?? null;
  const globals = useGlobalFields(template?.id, template?.version);
  const { mutate: updateRecord } = useUpdateRecord(record.id, { silentErrors: true });

  const saveField = useCallback<SaveField>(
    (key, value, { onSuccess, onError }) =>
      updateRecord({ extended_fields: { [key]: value } }, { onSuccess, onError }),
    [updateRecord]
  );

  const hasGlobalFields = !globals.isLoading && !globals.isError && globals.fields.length > 0;

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
      ) : (
        <>
          {globals.isLoading ? (
            <EuiSkeletonText lines={2} aria-label={fieldsI18n.GLOBAL_FIELDS_LOADING} />
          ) : globals.isError ? (
            <EuiCallOut
              announceOnMount
              size="s"
              color="danger"
              title={fieldsI18n.GLOBAL_FIELDS_ERROR}
              data-test-subj="investigationGlobalFieldsError"
            />
          ) : hasGlobalFields ? (
            <GlobalFieldsGroup
              fields={globals.fields}
              extendedFields={theCase.extended_fields}
              saveField={saveField}
            />
          ) : null}
          {globals.isLoading || globals.isError || hasGlobalFields ? <EuiSpacer size="m" /> : null}
          {template ? (
            <TypeFields
              key={`${template.id}:${template.version}`}
              template={template}
              extendedFields={theCase.extended_fields}
              saveField={saveField}
              title={
                hasGlobalFields
                  ? fieldsI18n.TEMPLATE_FIELDS_TITLE(record.investigation_type)
                  : undefined
              }
            />
          ) : (
            <EuiText size="s" color="subdued" data-test-subj="investigationFieldsNoType">
              {i18n.FIELDS_NO_TYPE}
            </EuiText>
          )}
        </>
      )}
    </SideCard>
  );
};
FieldsCard.displayName = 'FieldsCard';
