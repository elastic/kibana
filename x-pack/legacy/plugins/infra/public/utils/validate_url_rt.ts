/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fold } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';
import * as rt from 'io-ts';

export const getEncodeDecodeFromRT = (typeRT: rt.Type<any>) => ({
  encodeUrlState: typeRT.encode,
  decodeUrlState: (value: unknown) =>
    pipe(typeRT.decode(value), fold(constant(undefined), identity)),
});
