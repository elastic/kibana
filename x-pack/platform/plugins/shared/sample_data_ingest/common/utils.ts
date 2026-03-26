/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DatasetSampleType } from '.';
import { indexNamePrefix as sampleIndexNamePrefix } from '.';

export const getSampleDataIndexName = (sampleType: DatasetSampleType): string =>
  `${sampleIndexNamePrefix}${sampleType.toLowerCase()}`;
