/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiFieldNumber,
  EuiFieldText,
  EuiFormRow,
  EuiSelect,
  EuiSwitch,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type {
  FieldValue,
  InvestigationRecord,
  InvestigationType,
} from '../../../../common/investigations/types';
import { useInvestigationTypes, useUpdateRecord } from '../../hooks';
import { SideCard } from './side_card';
import * as i18n from './translations';

type TypeField = InvestigationType['fields'][number];

const toText = (value: FieldValue | undefined): string =>
  value === null || value === undefined ? '' : String(value);

interface FieldEditorProps {
  field: TypeField;
  value: FieldValue | undefined;
  onCommit: (value: FieldValue) => void;
}

/** One typed form field. Text, number and date inputs save on blur, choices save on change. */
const FieldEditor: React.FC<FieldEditorProps> = ({ field, value, onCommit }) => {
  const [draft, setDraft] = useState<string>(toText(value));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(toText(value));
    setError(null);
  }, [value]);

  const inputTestSubj = `investigationField-${field.key}`;

  if (field.type === 'bool') {
    return (
      <EuiFormRow fullWidth>
        <EuiSwitch
          compressed
          label={field.label}
          checked={value === true}
          onChange={(event) => onCommit(event.target.checked)}
          data-test-subj={inputTestSubj}
        />
      </EuiFormRow>
    );
  }

  if (field.options && field.options.length > 0) {
    return (
      <EuiFormRow label={field.label} fullWidth>
        <EuiSelect
          compressed
          fullWidth
          options={[
            { value: '', text: i18n.FIELD_NO_OPTION },
            ...field.options.map((option) => ({ value: option, text: option })),
          ]}
          value={toText(value)}
          onChange={(event) => onCommit(event.target.value === '' ? null : event.target.value)}
          data-test-subj={inputTestSubj}
        />
      </EuiFormRow>
    );
  }

  const commit = () => {
    if (draft === toText(value)) {
      setError(null);
      return;
    }
    if (draft.trim() === '') {
      setError(null);
      onCommit(null);
      return;
    }
    if (field.type === 'long' || field.type === 'double') {
      const parsed = Number(draft);
      const isValid =
        Number.isFinite(parsed) && (field.type === 'double' || Number.isInteger(parsed));
      if (!isValid) {
        setError(i18n.FIELD_NUMBER_INVALID);
        return;
      }
      setError(null);
      onCommit(parsed);
      return;
    }
    if (field.type === 'date' && Number.isNaN(Date.parse(draft))) {
      setError(i18n.FIELD_DATE_INVALID);
      return;
    }
    setError(null);
    onCommit(draft);
  };

  const isNumber = field.type === 'long' || field.type === 'double';

  return (
    <EuiFormRow label={field.label} fullWidth isInvalid={error !== null} error={error}>
      {isNumber ? (
        <EuiFieldNumber
          compressed
          fullWidth
          step={field.type === 'long' ? 1 : 'any'}
          value={draft}
          placeholder={i18n.FIELD_EMPTY}
          isInvalid={error !== null}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          data-test-subj={inputTestSubj}
        />
      ) : (
        <EuiFieldText
          compressed
          fullWidth
          value={draft}
          placeholder={field.type === 'date' ? i18n.FIELD_DATE_PLACEHOLDER : i18n.FIELD_EMPTY}
          isInvalid={error !== null}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          data-test-subj={inputTestSubj}
        />
      )}
    </EuiFormRow>
  );
};
FieldEditor.displayName = 'FieldEditor';

export interface FieldsCardProps {
  record: InvestigationRecord;
}

/** Editable investigation type and the type's form fields. */
export const FieldsCard: React.FC<FieldsCardProps> = ({ record }) => {
  const { euiTheme } = useEuiTheme();
  const { data, isLoading } = useInvestigationTypes();
  const { mutate: updateRecord } = useUpdateRecord(record.id);

  const types = data?.types ?? [];
  const currentType = types.find(({ name }) => name === record.investigation_type);
  const typeNames = types.map(({ name }) => name);
  if (!typeNames.includes(record.investigation_type)) {
    typeNames.unshift(record.investigation_type);
  }

  return (
    <SideCard
      title={i18n.FIELDS}
      action={
        <EuiText size="xs" color="subdued">
          {i18n.FIELDS_SEARCHABLE}
        </EuiText>
      }
      data-test-subj="investigationFieldsCard"
    >
      <div
        css={css`
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.s};
        `}
      >
        <EuiFormRow label={i18n.INVESTIGATION_TYPE} fullWidth>
          <EuiSelect
            compressed
            fullWidth
            isLoading={isLoading}
            options={typeNames.map((name) => ({ value: name, text: name }))}
            value={record.investigation_type}
            onChange={(event) => {
              if (event.target.value !== record.investigation_type) {
                updateRecord({ investigation_type: event.target.value });
              }
            }}
            data-test-subj="investigationTypeSelect"
          />
        </EuiFormRow>
        {(currentType?.fields ?? []).map((field) => (
          <FieldEditor
            key={field.key}
            field={field}
            value={record.fields[field.key]}
            onCommit={(value) => updateRecord({ fields: { ...record.fields, [field.key]: value } })}
          />
        ))}
        <EuiText size="xs" color="subdued">
          {i18n.FIELDS_HELP}
        </EuiText>
      </div>
    </SideCard>
  );
};
FieldsCard.displayName = 'FieldsCard';
