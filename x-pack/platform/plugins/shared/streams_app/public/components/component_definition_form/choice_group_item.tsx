/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSelect } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { CatalogueChoiceGroup, CatalogueNamedFieldDefinition } from '@kbn/streams-schema';
import { isFieldAvailable, isFieldRequired } from './conditions';
import { FieldControl } from './field_control';
import { labelOf, toControlId } from './field_helpers';
import { useDefinitionFormContext } from './form_context';
import { toRowChrome } from './row_chrome';
import { joinPointer, type FormValue, type ObjectValue } from './values';

const NO_CHOICE = '__none__';

const noChoiceLabel = i18n.translate('xpack.streams.componentDefinitionForm.choice.unset', {
  defaultMessage: 'Not set',
});

// The select is as wide as its longest option, so no member is cut short; the input takes the
// rest and shrinks with a cell that shares its line with other fields.
const selectStyles = css`
  flex-shrink: 0;
`;
const inputStyles = css`
  min-width: 0;
`;

interface ChoiceGroupItemProps {
  group: CatalogueChoiceGroup;
  fields: readonly CatalogueNamedFieldDefinition[];
  value: ObjectValue;
  pointer: string;
  selected: string | undefined;
  onSelect: (group: CatalogueChoiceGroup, fieldName: string | undefined) => void;
  onFieldChange: (name: string, fieldValue: FormValue | undefined) => void;
  compact?: boolean;
}

/**
 * A choice group as one row under the label of the group: a select of its members, however many
 * there are, and next to it the input of the chosen one.
 */
export function ChoiceGroupItem({
  group,
  fields,
  value,
  pointer,
  selected,
  onSelect,
  onFieldChange,
  compact,
}: ChoiceGroupItemProps) {
  const { telemetry, errors, idPrefix } = useDefinitionFormContext();
  const members = group.fields.flatMap((name) => {
    const member = fields.find((candidate) => candidate.name === name);
    return member && isFieldAvailable(member, value, telemetry) ? [member] : [];
  });
  const selectedField = members.find(({ name }) => name === selected);
  const groupLabel = group.label ?? (selectedField ? labelOf(selectedField) : group.id);
  const options = [
    // A group that has to have a member chosen offers no way to leave it unset.
    ...(group.min_selected === 0 || !selectedField
      ? [{ value: NO_CHOICE, text: noChoiceLabel }]
      : []),
    ...members.map((member) => ({ value: member.name, text: labelOf(member) })),
  ];
  const fieldPointer = selectedField ? joinPointer(pointer, selectedField.name) : undefined;
  const error = fieldPointer === undefined ? undefined : errors[fieldPointer];
  // A path picker is a form row of its own and shows its error itself.
  const rowError = selectedField?.type === 'path' ? undefined : error;
  const { label, helpText } = toRowChrome({
    label: groupLabel,
    description: selectedField?.description,
    compact,
  });

  return (
    <EuiFormRow
      fullWidth
      // The label is that of the select and the input together.
      labelType="legend"
      label={label}
      helpText={helpText}
      isInvalid={rowError !== undefined}
      error={rowError}
      id={toControlId(idPrefix, joinPointer(pointer, `choice:${group.id}`))}
      data-test-subj={`componentDefinitionFormRow-${selectedField?.name ?? group.id}`}
    >
      <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
        <EuiFlexItem grow={false} css={selectStyles}>
          <EuiSelect
            compressed
            aria-label={i18n.translate('xpack.streams.componentDefinitionForm.choice.select', {
              defaultMessage: '{group} kind',
              values: { group: groupLabel },
            })}
            options={options}
            value={selectedField?.name ?? NO_CHOICE}
            onChange={(event) =>
              onSelect(group, event.target.value === NO_CHOICE ? undefined : event.target.value)
            }
            data-test-subj={`componentDefinitionFormChoice-${group.id}`}
          />
        </EuiFlexItem>
        {selectedField && fieldPointer !== undefined ? (
          <EuiFlexItem grow css={inputStyles}>
            <FieldControl
              field={selectedField}
              value={value[selectedField.name]}
              onChange={(next) => onFieldChange(selectedField.name, next)}
              pointer={fieldPointer}
              scope={value}
              required={isFieldRequired(selectedField, value, telemetry)}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiFormRow>
  );
}
