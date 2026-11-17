/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiFieldNumber,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiSwitch,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { CatalogueLiteralField, CatalogueLiteralKind } from '@kbn/streams-schema';
import { JsonValueControl } from './json_value_control';
import type { FormValue } from '../values';

const ALL_KINDS: CatalogueLiteralKind[] = [
  'string',
  'integer',
  'number',
  'boolean',
  'null',
  'array',
  'object',
];

const KIND_LABELS: Record<CatalogueLiteralKind, string> = {
  string: i18n.translate('xpack.streams.componentDefinitionForm.literal.string', {
    defaultMessage: 'String',
  }),
  integer: i18n.translate('xpack.streams.componentDefinitionForm.literal.integer', {
    defaultMessage: 'Integer',
  }),
  number: i18n.translate('xpack.streams.componentDefinitionForm.literal.number', {
    defaultMessage: 'Number',
  }),
  boolean: i18n.translate('xpack.streams.componentDefinitionForm.literal.boolean', {
    defaultMessage: 'Boolean',
  }),
  null: i18n.translate('xpack.streams.componentDefinitionForm.literal.null', {
    defaultMessage: 'Null',
  }),
  array: i18n.translate('xpack.streams.componentDefinitionForm.literal.array', {
    defaultMessage: 'Array',
  }),
  object: i18n.translate('xpack.streams.componentDefinitionForm.literal.object', {
    defaultMessage: 'Object',
  }),
};

export const literalKindOf = (
  value: FormValue | undefined,
  kinds: readonly CatalogueLiteralKind[]
): CatalogueLiteralKind => {
  const fallback = kinds[0] ?? 'string';
  if (value === undefined) {
    return fallback;
  }
  if (value === null) {
    return 'null';
  }
  if (Array.isArray(value)) {
    return 'array';
  }
  switch (typeof value) {
    case 'boolean':
      return 'boolean';
    case 'number':
      return Number.isInteger(value) && kinds.includes('integer') ? 'integer' : 'number';
    case 'string':
      return 'string';
    default:
      return 'object';
  }
};

const emptyValueFor = (kind: CatalogueLiteralKind): FormValue | undefined => {
  switch (kind) {
    case 'boolean':
      return false;
    case 'null':
      return null;
    case 'array':
      return [];
    case 'object':
      return {};
    default:
      return undefined;
  }
};

interface LiteralControlProps {
  field: CatalogueLiteralField;
  value: FormValue | undefined;
  onChange: (value: FormValue | undefined) => void;
  isInvalid: boolean;
  controlId: string;
}

export function LiteralControl({
  field,
  value,
  onChange,
  isInvalid,
  controlId,
}: LiteralControlProps) {
  const kinds = field.literal_kinds?.length ? field.literal_kinds : ALL_KINDS;
  const [kind, setKind] = useState<CatalogueLiteralKind>(() => literalKindOf(value, kinds));
  const testSubj = `componentDefinitionFormLiteral-${field.name}`;

  const input = (() => {
    switch (kind) {
      case 'integer':
      case 'number':
        return (
          <EuiFieldNumber
            id={controlId}
            compressed
            fullWidth
            step={kind === 'integer' ? 1 : 'any'}
            isInvalid={isInvalid}
            value={typeof value === 'number' ? value : ''}
            onChange={(event) =>
              onChange(event.target.value === '' ? undefined : Number(event.target.value))
            }
            data-test-subj={testSubj}
          />
        );
      case 'boolean':
        return (
          <EuiSwitch
            id={controlId}
            compressed
            label={field.label ?? field.name ?? ''}
            showLabel={false}
            checked={value === true}
            onChange={(event) => onChange(event.target.checked)}
            data-test-subj={testSubj}
          />
        );
      case 'null':
        return <EuiFieldText id={controlId} compressed fullWidth disabled value="null" />;
      case 'array':
      case 'object':
        return (
          <JsonValueControl
            controlId={controlId}
            value={value}
            onChange={onChange}
            isInvalid={isInvalid}
            data-test-subj={testSubj}
          />
        );
      default:
        return (
          <EuiFieldText
            id={controlId}
            compressed
            fullWidth
            isInvalid={isInvalid}
            placeholder={field.ui?.placeholder}
            value={typeof value === 'string' ? value : ''}
            onChange={(event) => onChange(event.target.value)}
            data-test-subj={testSubj}
          />
        );
    }
  })();

  if (kinds.length < 2) {
    return input;
  }

  return (
    <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="flexStart">
      <EuiFlexItem grow={false}>
        <EuiSelect
          compressed
          aria-label={i18n.translate('xpack.streams.componentDefinitionForm.literal.kindLabel', {
            defaultMessage: 'Value type',
          })}
          options={kinds.map((literalKind) => ({
            value: literalKind,
            text: KIND_LABELS[literalKind],
          }))}
          value={kind}
          onChange={(event) => {
            const nextKind = kinds.find((literalKind) => literalKind === event.target.value);
            if (!nextKind) {
              return;
            }
            setKind(nextKind);
            onChange(emptyValueFor(nextKind));
          }}
          data-test-subj={`${testSubj}-kind`}
        />
      </EuiFlexItem>
      <EuiFlexItem>{input}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
