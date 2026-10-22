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
import { joinPointer, type FormValue, type ObjectValue } from './values';

interface FieldRowItemProps {
  field: CatalogueNamedFieldDefinition;
  value: ObjectValue;
  pointer: string;
  onFieldChange: (name: string, fieldValue: FormValue | undefined) => void;
  labelAppend?: React.ReactNode;
}

/** One field as a full-width form row: label, input, then the description as help text. */
export function FieldRowItem({
  field,
  value,
  pointer,
  onFieldChange,
  labelAppend,
}: FieldRowItemProps) {
  const { telemetry, errors, idPrefix } = useDefinitionFormContext();
  const fieldPointer = joinPointer(pointer, field.name);
  const error = errors[fieldPointer];
  const required = isFieldRequired(field, value, telemetry);
  const onChange = (next: FormValue | undefined) => onFieldChange(field.name, next);

  if (field.type === 'path') {
    return (
      <PathField
        field={field}
        value={value[field.name]}
        onChange={onChange}
        scope={value}
        label={labelOf(field)}
        helpText={field.description}
        error={error}
        labelAppend={labelAppend}
      />
    );
  }

  return (
    <EuiFormRow
      fullWidth
      label={field.type === 'boolean' ? undefined : labelOf(field)}
      labelAppend={labelAppend}
      helpText={field.description}
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
