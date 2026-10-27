/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CatalogueChoiceGroup, CatalogueNamedFieldDefinition } from '@kbn/streams-schema';
import { isFieldAvailable } from './conditions';
import { labelOf } from './field_helpers';
import { FieldRowItem } from './field_row_item';
import { useDefinitionFormContext } from './form_context';
import type { FormValue, ObjectValue } from './values';

const NO_CHOICE = '__none__';

interface ChoiceGroupItemProps {
  group: CatalogueChoiceGroup;
  fields: readonly CatalogueNamedFieldDefinition[];
  value: ObjectValue;
  pointer: string;
  selected: string | undefined;
  onSelect: (group: CatalogueChoiceGroup, fieldName: string | undefined) => void;
  onFieldChange: (name: string, fieldValue: FormValue | undefined) => void;
}

/**
 * Shows the chosen member of a choice group, with "Use …" links to switch to
 * the others, like the processing editor's "Use copy from field" toggle.
 */
export function ChoiceGroupItem({
  group,
  fields,
  value,
  pointer,
  selected,
  onSelect,
  onFieldChange,
}: ChoiceGroupItemProps) {
  const { telemetry } = useDefinitionFormContext();
  const members = group.fields.flatMap((name) => {
    const member = fields.find((candidate) => candidate.name === name);
    return member && isFieldAvailable(member, value, telemetry) ? [member] : [];
  });
  const selectedField = members.find(({ name }) => name === selected);
  const alternatives = [
    ...members
      .filter(({ name }) => name !== selected)
      .map((member) => ({
        id: member.name,
        label: i18n.translate('xpack.streams.componentDefinitionForm.choice.use', {
          defaultMessage: 'Use {label}',
          values: { label: labelOf(member) },
        }),
      })),
    ...(group.min_selected === 0 && selectedField
      ? [
          {
            id: NO_CHOICE,
            label: i18n.translate('xpack.streams.componentDefinitionForm.choice.none', {
              defaultMessage: 'Leave unset',
            }),
          },
        ]
      : []),
  ];
  const links = alternatives.length > 0 && (
    <EuiText size="xs" data-test-subj={`componentDefinitionFormChoice-${group.id}`}>
      {alternatives.map((alternative, index) => (
        <React.Fragment key={alternative.id}>
          {index > 0 ? ' · ' : null}
          <EuiLink
            onClick={() =>
              onSelect(group, alternative.id === NO_CHOICE ? undefined : alternative.id)
            }
            data-test-subj={`componentDefinitionFormChoice-${group.id}-${alternative.id}`}
          >
            {alternative.label}
          </EuiLink>
        </React.Fragment>
      ))}
    </EuiText>
  );

  if (!selectedField) {
    return (
      <EuiFormRow fullWidth label={group.label ?? group.id} labelAppend={links}>
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.streams.componentDefinitionForm.choice.unset', {
            defaultMessage: 'Not set',
          })}
        </EuiText>
      </EuiFormRow>
    );
  }
  return (
    <FieldRowItem
      field={selectedField}
      value={value}
      pointer={pointer}
      onFieldChange={onFieldChange}
      labelAppend={links}
    />
  );
}
