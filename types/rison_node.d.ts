/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// tslint:disable:variable-name
declare module 'rison-node' {
  export const decode_object: <ResultObject extends {}>(
    input: string
  ) => ResultObject;

  export const encode_object: <InputObject extends {}>(
    input: InputObject
  ) => string;
}