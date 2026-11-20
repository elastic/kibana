/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText, EuiTextArea, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { CatalogueStringField } from '@kbn/streams-schema';
import type { FormValue } from '../values';

const CODE_FORMATS = new Set(['ottl_statement', 'ottl_value', 'ottl_condition', 'regex', 'grok']);

interface StringControlProps {
  field: CatalogueStringField;
  value: FormValue | undefined;
  onChange: (value: FormValue | undefined) => void;
  isInvalid: boolean;
  controlId: string;
}

export function StringControl({
  field,
  value,
  onChange,
  isInvalid,
  controlId,
}: StringControlProps) {
  const { euiTheme } = useEuiTheme();
  const isCode = field.format !== undefined && CODE_FORMATS.has(field.format);
  const codeStyles = isCode
    ? css`
        font-family: ${euiTheme.font.familyCode};
      `
    : undefined;
  const common = {
    id: controlId,
    compressed: true,
    fullWidth: true,
    isInvalid,
    placeholder: field.ui?.placeholder,
    value: typeof value === 'string' ? value : '',
    css: codeStyles,
    'data-test-subj': `componentDefinitionFormString-${field.name}`,
  };
  if (field.ui?.multiline || (field.ui?.lines ?? 1) > 1) {
    return (
      <EuiTextArea
        {...common}
        rows={field.ui?.lines ?? 3}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }
  return <EuiFieldText {...common} onChange={(event) => onChange(event.target.value)} />;
}
