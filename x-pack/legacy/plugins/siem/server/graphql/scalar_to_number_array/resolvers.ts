/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { GraphQLScalarType, Kind } from 'graphql';
import { isBoolean, isNumber, isObject, isString } from 'lodash/fp';

/*
 *  serialize: gets invoked when serializing the result to send it back to a client.
 *
 *  parseValue: gets invoked to parse client input that was passed through variables.
 *
 *  parseLiteral: gets invoked to parse client input that was passed inline in the query.
 */

export const toNumberArrayScalar = new GraphQLScalarType({
  name: 'NumberArray',
  description: 'Represents value in detail item from the timeline who wants to more than one type',
  serialize(value): number[] | null {
    if (value == null) {
      return null;
    } else if (Array.isArray(value)) {
      return convertArrayToNumber(value) as number[];
    } else if (isBoolean(value) || isString(value) || isObject(value)) {
      return [convertToNumber(value)];
    }
    return [value];
  },
  parseValue(value) {
    return value;
  },
  parseLiteral(ast) {
    switch (ast.kind) {
      case Kind.INT:
        return ast.value;
      case Kind.FLOAT:
        return ast.value;
      case Kind.STRING:
        return parseFloat(ast.value);
      case Kind.LIST:
        return ast.values;
      case Kind.OBJECT:
        return ast.fields;
    }
    return null;
  },
});

export const createScalarToNumberArrayValueResolvers = () => ({
  ToNumberArray: toNumberArrayScalar,
});

const convertToNumber = (value: object | number | boolean | string): number => {
  if (isNumber(value)) {
    return value;
  } else if (isString(value)) {
    return parseFloat(value);
  } else {
    return NaN;
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const convertArrayToNumber = (values: any[]): number[] | number => {
  if (Array.isArray(values)) {
    return values.filter(item => item != null).map(item => convertArrayToNumber(item)) as number[];
  }
  return convertToNumber(values);
};
