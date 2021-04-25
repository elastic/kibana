/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

declare module 'rison-node' {
  export type RisonValue = undefined | null | boolean | number | string | RisonObject | RisonArray;

  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  export interface RisonArray extends Array<RisonValue> {}

  export interface RisonObject {
    [key: string]: RisonValue;
  }

  export const decode: (input: string) => RisonValue;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  export const decode_object: (input: string) => RisonObject;

  export const encode: <Input extends RisonValue>(input: Input) => string;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  export const encode_object: <Input extends RisonObject>(input: Input) => string;
}
