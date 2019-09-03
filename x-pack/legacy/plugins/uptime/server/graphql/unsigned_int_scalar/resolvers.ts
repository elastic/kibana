/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLScalarType, Kind, ValueNode } from 'graphql';
import { UMServerLibs } from '../../lib/lib';
import { CreateUMGraphQLResolvers } from '../types';

export const serialize = (value: any): number => {
  // `parseInt` will yield `2019` for a value such as "2019-07-08T16:59:09.796Z"
  if (isNaN(Number(value))) {
    return Date.parse(value);
  }
  return parseInt(value, 10);
};

export const parseValue = (value: any) => {
  const parsed = parseInt(value, 10);
  if (parsed < 0) {
    return null;
  }
  return parsed;
};

export const parseLiteral = (ast: ValueNode) => {
  switch (ast.kind) {
    case Kind.INT:
    case Kind.FLOAT:
    case Kind.STRING:
      return parseInt(ast.value, 10);
  }
  return null;
};

const unsignedIntegerScalar = new GraphQLScalarType({
  name: 'UnsignedInteger',
  description: 'Represents an unsigned 32-bit integer',
  serialize,
  parseValue,
  parseLiteral,
});

/**
 * This scalar resolver will parse an integer string of > 32 bits and return a value of type `number`.
 * This assumes that the code is running in an environment that supports big ints.
 */
export const unsignedIntegerResolverFunctions: CreateUMGraphQLResolvers = (libs: UMServerLibs) => ({
  UnsignedInteger: unsignedIntegerScalar,
});
