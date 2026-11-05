/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDocument, visit, type Scalar } from 'yaml';

// Returns the YAML scalar containing `offset`, if any.
const getScalarAtOffset = (source: string, offset: number): Scalar | undefined => {
  let scalarAtOffset: Scalar | undefined;
  visit(parseDocument(source), {
    Scalar(_, scalar) {
      if (scalar.range && scalar.range[0] <= offset && offset <= scalar.range[2]) {
        scalarAtOffset = scalar;
      }
    },
  });
  return scalarAtOffset;
};

/**
 * Returns the `{{ name }}` template to insert between `before` and `after` in a params YAML,
 * quoted when it starts an unquoted value so YAML does not parse it as a flow mapping.
 */
export const getVariableInsertText = (name: string, before: string, after: string): string => {
  const template = `{{ ${name} }}`;
  const scalar = getScalarAtOffset(`${before}${after}`, before.length);
  const scalarType = scalar?.type ?? null;
  const value = typeof scalar?.value === 'string' ? scalar.value : '';

  // Mirrors the `shouldBeQuoted` rule of the workflows YAML editor's variable autocomplete
  // (workflows_management `get_variable_suggestions.ts`). ToDo: replace with a shared helper
  // once workflows exposes one, so both editors quote inserted variables the same way.
  const shouldBeQuoted =
    (scalarType === null || scalarType === 'PLAIN') &&
    (value === '' || value.startsWith('{{') || value.startsWith('@'));

  return shouldBeQuoted ? `"${template}"` : template;
};
