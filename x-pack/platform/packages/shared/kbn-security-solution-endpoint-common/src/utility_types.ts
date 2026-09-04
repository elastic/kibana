/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Recursively strips `readonly` modifiers from a type.
 *
 * A package-local copy of the identical utility in
 * security_solution/common/endpoint/types/utility_types.ts. It is a pure structural type
 * transform with no behaviour to drift, and the plugin's copy has consumers that are not
 * moving here, so the two are kept independent rather than one importing the other.
 */
export type DeepMutable<T> = T extends Record<any, any>
  ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
  : T;
