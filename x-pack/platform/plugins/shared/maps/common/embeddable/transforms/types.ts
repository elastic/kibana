/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StoredTitles } from '@kbn/presentation-publishing-schemas';
import type { StoredMapAttributes } from '../../../server';
import type { MapByReferenceState, MapByValueState } from '../types';

type StoredMapByReferenceState = Omit<MapByReferenceState, 'savedObjectId'>;

type StoredByValueState = Omit<MapByValueState, 'attributes'> & {
  attributes: StoredMapAttributes;
};

export type StoredMapEmbeddableState = StoredTitles &
  (StoredMapByReferenceState | StoredByValueState);
