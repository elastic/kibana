/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';

import type { JsonArray, JsonObject, JsonValue } from '@kbn/utility-types';
import { formatErrors } from '@kbn/securitysolution-io-ts-utils/src/format_errors';
type ErrorFactory = (message: string) => Error;
export const throwErrors = (createError: ErrorFactory) => (errors: rt.Errors) => {
  throw createError(formatErrors(errors).join());
};

export const jsonScalarRt = rt.union([rt.null, rt.boolean, rt.number, rt.string]);

export const jsonValueRt: rt.Type<JsonValue> = rt.recursion('JsonValue', () =>
  rt.union([jsonScalarRt, jsonArrayRt, jsonObjectRt])
);

export const jsonArrayRt: rt.Type<JsonArray> = rt.recursion('JsonArray', () =>
  rt.array(jsonValueRt)
);

export const jsonObjectRt: rt.Type<JsonObject> = rt.recursion('JsonObject', () =>
  rt.record(rt.string, jsonValueRt)
);
