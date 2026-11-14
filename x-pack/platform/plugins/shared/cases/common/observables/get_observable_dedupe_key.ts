/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Returns a key that is the same only for the same type key and value.
 * A text join is not enough: the type `foo` with the value `bar-1` and the type `foo-bar` with the value `1` give the same text.
 */
export const getObservableDedupeKey = (typeKey: string, value: string): string =>
  JSON.stringify([typeKey, value]);
