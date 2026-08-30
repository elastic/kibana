/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';
import { EXPERIMENT_RECORD_UUID_NAMESPACE } from '../constants';

/**
 * The id an experiment record takes in a space. Deriving it from the pair that
 * identifies a record lets a create refuse a duplicate on its own: two writes
 * for the same experiment compete for one id, and the second is rejected
 * rather than overwriting the first.
 */
export const getExperimentRecordId = (spaceId: string, experimentId: string): string =>
  uuidv5(JSON.stringify([spaceId, experimentId]), EXPERIMENT_RECORD_UUID_NAMESPACE);
