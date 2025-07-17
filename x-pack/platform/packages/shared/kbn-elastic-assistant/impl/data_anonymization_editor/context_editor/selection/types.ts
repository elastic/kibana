/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FindAnonymizationFieldsResponse } from '@kbn/elastic-assistant-common';

export type HandlePageChecked = () => void;
export type HandlePageUnchecked = () => void;
export type HandleRowChecked = (selectedField: string) => void;
export type HandleRowUnChecked = (selectedField: string) => void;
export type FindAnonymizationFieldsClientResponse = Omit<
  FindAnonymizationFieldsResponse,
  'aggregations' | 'all'
>;
