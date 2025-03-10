/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chain } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import * as rt from 'io-ts';

export const booleanFromStringRT = new rt.Type<boolean, string, unknown>(
  'BooleanFromString',
  rt.boolean.is,
  (value, context) =>
    pipe(
      rt.string.validate(value, context),
      chain((stringValue) =>
        stringValue === 'true'
          ? rt.success(true)
          : stringValue === 'false'
          ? rt.success(false)
          : rt.failure(value, context)
      )
    ),
  String
);
