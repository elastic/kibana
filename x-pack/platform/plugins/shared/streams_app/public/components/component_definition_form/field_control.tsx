/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldNumber, EuiFieldPassword, EuiPanel, EuiSwitch } from '@elastic/eui';
import type { CatalogueFieldDefinition } from '@kbn/streams-schema';
import { ArrayControl } from './controls/array_control';
import { ComponentReferenceControl } from './controls/component_reference_control';
import { EnumControl } from './controls/enum_control';
import { JsonValueControl } from './controls/json_value_control';
import { LiteralControl } from './controls/literal_control';
import { MapControl } from './controls/map_control';
import { StringControl } from './controls/string_control';
import { labelOf, toControlId } from './field_helpers';
import { FieldList } from './field_list';
import { useDefinitionFormContext } from './form_context';
import { isObjectValue, type FormValue, type ObjectValue } from './values';

interface FieldControlProps {
  field: CatalogueFieldDefinition;
  value: FormValue | undefined;
  onChange: (value: FormValue | undefined) => void;
  pointer: string;
  scope: ObjectValue;
  required: boolean;
}

/** The input for one field, without its form row. */
export function FieldControl({
  field,
  value,
  onChange,
  pointer,
  scope,
  required,
}: FieldControlProps) {
  const { errors, idPrefix } = useDefinitionFormContext();
  const controlId = toControlId(idPrefix, pointer);
  const isInvalid = errors[pointer] !== undefined;
  switch (field.type) {
    case 'string':
      return (
        <StringControl
          field={field}
          value={value}
          onChange={onChange}
          isInvalid={isInvalid}
          controlId={controlId}
        />
      );
    case 'secret':
      return (
        <EuiFieldPassword
          id={controlId}
          compressed
          fullWidth
          type="dual"
          isInvalid={isInvalid}
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(event.target.value)}
          data-test-subj={`componentDefinitionFormSecret-${field.name}`}
        />
      );
    case 'integer':
    case 'number':
      return (
        <EuiFieldNumber
          id={controlId}
          compressed
          fullWidth
          isInvalid={isInvalid}
          min={field.minimum}
          max={field.maximum}
          step={field.type === 'integer' ? 1 : 'any'}
          value={typeof value === 'number' ? value : ''}
          onChange={(event) =>
            onChange(event.target.value === '' ? undefined : Number(event.target.value))
          }
          data-test-subj={`componentDefinitionFormNumber-${field.name}`}
        />
      );
    case 'boolean':
      return (
        <EuiSwitch
          id={controlId}
          compressed
          label={labelOf(field)}
          checked={value === true}
          onChange={(event) => onChange(event.target.checked)}
          data-test-subj={`componentDefinitionFormBoolean-${field.name}`}
        />
      );
    case 'literal':
      return (
        <LiteralControl
          field={field}
          value={value}
          onChange={onChange}
          isInvalid={isInvalid}
          controlId={controlId}
        />
      );
    case 'enum':
      return (
        <EnumControl
          field={field}
          value={value}
          onChange={onChange}
          isInvalid={isInvalid}
          controlId={controlId}
          allowEmpty={!required}
        />
      );
    case 'component_reference':
      return (
        <ComponentReferenceControl
          field={field}
          value={value}
          onChange={onChange}
          isInvalid={isInvalid}
          controlId={controlId}
        />
      );
    case 'object':
      return (
        <EuiPanel color="subdued" hasShadow={false} paddingSize="m">
          <FieldList
            fields={field.fields}
            choiceGroups={field.choice_groups}
            value={isObjectValue(value) ? value : {}}
            onChange={onChange}
            pointer={pointer}
          />
        </EuiPanel>
      );
    case 'array':
      return <ArrayControl field={field} value={value} onChange={onChange} pointer={pointer} />;
    case 'map':
      return <MapControl field={field} value={value} onChange={onChange} pointer={pointer} />;
    default:
      return (
        <JsonValueControl
          controlId={controlId}
          value={value}
          onChange={onChange}
          isInvalid={isInvalid}
        />
      );
  }
}
