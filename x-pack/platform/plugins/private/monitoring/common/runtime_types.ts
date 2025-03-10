/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Context, IntersectionType, UnionType, ValidationError } from 'io-ts';

const getErrorPath = ([first, ...rest]: Context): string[] => {
  if (typeof first === 'undefined') {
    return [];
  } else if (first.type instanceof IntersectionType) {
    const [, ...next] = rest;
    return getErrorPath(next);
  } else if (first.type instanceof UnionType) {
    const [, ...next] = rest;
    return [first.key, ...getErrorPath(next)];
  }

  return [first.key, ...getErrorPath(rest)];
};

const getErrorType = ({ context }: ValidationError) =>
  context[context.length - 1]?.type?.name ?? 'unknown';

const formatError = (error: ValidationError) =>
  error.message ??
  `in ${getErrorPath(error.context).join('/')}: ${JSON.stringify(
    error.value
  )} does not match expected type ${getErrorType(error)}`;

export const formatErrors = (errors: ValidationError[]) =>
  `Failed to validate: \n${errors.map((error) => `  ${formatError(error)}`).join('\n')}`;
