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
 * The id a dataset takes in a space. The default space keeps the derivation it
 * had before space-awareness, so ids already stored still point at the same
 * dataset.
 *
 * Later generations are the ids a create falls through to when an earlier one is
 * held by a dataset that has moved away; being derived is what makes two creates
 * of one name compete for a single id. A lookup wants the first.
 *
 * Kept out of the plugin because the offline client derives ids too, and one the
 * server disagreed with would point scores at a dataset that doesn't exist.
 */
export const getDatasetId = (spaceId: string, name: string, generation: number = 0): string => {
  if (generation > 0) {
    return uuidv5(JSON.stringify([spaceId, name, generation]), DATASET_UUID_NAMESPACE);
  }

  return spaceId === DEFAULT_SPACE_ID
    ? uuidv5(name, DATASET_UUID_NAMESPACE)
    : uuidv5(JSON.stringify([spaceId, name]), DATASET_UUID_NAMESPACE);
};
