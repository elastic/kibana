/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFormRow } from '@elastic/eui';
import type { CatalogueNamedFieldDefinition } from '@kbn/streams-schema';
import { isFieldRequired } from './conditions';
import { PathField } from './controls/path_control';
import { FieldControl } from './field_control';
import { labelOf, toControlId } from './field_helpers';
import { useDefinitionFormContext } from './form_context';
import { toRowChrome } from './row_chrome';
import { joinPointer, type FormValue, type ObjectValue } from './values';

interface FieldRowItemProps {
  field: CatalogueNamedFieldDefinition;
  value: ObjectValue;
  pointer: string;
  onFieldChange: (name: string, fieldValue: FormValue | undefined) => void;
  compact?: boolean;
}

export function FieldRowItem({ field, value, pointer, onFieldChange, compact }: FieldRowItemProps) {
  const { telemetry, errors, idPrefix } = useDefinitionFormContext();
  const fieldPointer = joinPointer(pointer, field.name);
  const error = errors[fieldPointer];
  const required = isFieldRequired(field, value, telemetry);
  const onChange = (next: FormValue | undefined) => onFieldChange(field.name, next);
  const { label, helpText } = toRowChrome({
    label: labelOf(field),
    description: field.description,
    compact: compact && field.type !== 'boolean',
  });

  if (field.type === 'path') {
    return (
      <PathField
        field={field}
        value={value[field.name]}
        onChange={onChange}
        scope={value}
        label={label}
        helpText={helpText}
        error={error}
      />
    );
  }

  return (
    <EuiFormRow
      fullWidth
      label={field.type === 'boolean' ? undefined : label}
      helpText={helpText}
      isInvalid={error !== undefined}
      error={error}
      id={toControlId(idPrefix, fieldPointer)}
      data-test-subj={`componentDefinitionFormRow-${field.name}`}
    >
      <FieldControl
        field={field}
        value={value[field.name]}
        onChange={onChange}
        pointer={fieldPointer}
        scope={value}
        required={required}
      />
    </EuiFormRow>
  );
}
