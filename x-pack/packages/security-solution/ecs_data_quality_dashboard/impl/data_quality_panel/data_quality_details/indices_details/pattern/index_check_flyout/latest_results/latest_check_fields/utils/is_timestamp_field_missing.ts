/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsBasedFieldMetadata } from '../../../../../../../types';

/**
 * Checks if the timestamp field is missing
 */
export const isTimestampFieldMissing = (ecsBasedFieldMetadata: EcsBasedFieldMetadata[]): boolean =>
  !ecsBasedFieldMetadata.some((x) => x.name === '@timestamp');
