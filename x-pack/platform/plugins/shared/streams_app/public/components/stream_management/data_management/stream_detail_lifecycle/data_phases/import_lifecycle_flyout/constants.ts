/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const IMPORT_METHOD_DLM = 'dlm';
export const IMPORT_METHOD_ILM = 'ilm';

export type ImportLifecycleMethod = typeof IMPORT_METHOD_DLM | typeof IMPORT_METHOD_ILM;
