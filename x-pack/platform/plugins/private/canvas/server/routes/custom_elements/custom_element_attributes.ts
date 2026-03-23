/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomElement } from '../../../types';

// Exclude ID attribute for the type used for SavedObjectClient
export type CustomElementAttributes = Pick<CustomElement, Exclude<keyof CustomElement, 'id'>> & {
  '@timestamp': string;
  '@created': string;
};
