/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v5 as uuidv5 } from 'uuid';
import { DATASET_UUID_NAMESPACE } from '../constants';
import { DEFAULT_SPACE_ID } from './spaces';

/**
 * The id a dataset takes in a space. Names are unique per space, so the space
 * has to be part of the id; the default space keeps the derivation it had
 * before space-awareness, so ids already stored, and those older clients
 * compute, still point at the same dataset.
 *
 * Kept here rather than in the plugin because the offline client derives ids
 * too, to find a dataset without a round trip. A derivation the server
 * disagreed with would point its scores at a dataset that doesn't exist.
 */
export const getDatasetId = (spaceId: string, name: string): string =>
  spaceId === DEFAULT_SPACE_ID
    ? uuidv5(name, DATASET_UUID_NAMESPACE)
    : uuidv5(JSON.stringify([spaceId, name]), DATASET_UUID_NAMESPACE);
