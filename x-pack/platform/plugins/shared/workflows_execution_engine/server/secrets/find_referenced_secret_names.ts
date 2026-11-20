/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const SECRETS_ROOT = 'secrets';
const SECRET_REFERENCE_PATTERN = /\bsecrets\.([A-Za-z_][A-Za-z0-9_]*)/g;

type VariablePath = ReadonlyArray<string | number>;

const collectStrings = (value: unknown, strings: string[]): void => {
  if (typeof value === 'string') {
    strings.push(value);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, strings));
  } else if (value !== null && typeof value === 'object') {
    Object.values(value).forEach((item) => collectStrings(item, strings));
  }
};

/**
 * Returns the names referenced as `secrets.<name>` in a step's templates.
 * `variablePaths` are the variables the templating engine found, or `null` when it could not
 * analyze a template. The text is then searched instead, which can only find more names.
 */
export const findReferencedSecretNames = ({
  template,
  variablePaths,
}: {
  template: unknown;
  variablePaths: readonly VariablePath[] | null;
}): string[] => {
  const names = new Set<string>();
  if (variablePaths) {
    for (const [root, name] of variablePaths) {
      if (root === SECRETS_ROOT && typeof name === 'string') {
        names.add(name);
      }
    }
    return [...names];
  }
  const strings: string[] = [];
  collectStrings(template, strings);
  for (const text of strings) {
    for (const [, name] of text.matchAll(SECRET_REFERENCE_PATTERN)) {
      names.add(name);
    }
  }
  return [...names];
};
