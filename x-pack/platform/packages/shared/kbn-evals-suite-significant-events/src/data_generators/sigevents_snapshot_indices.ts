/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeIndexComponent } from './sanitize_index_component';

// retro-compatibility with current evals suite
const SIGEVENTS_FEATURES_TEMP_INDEX_PREFIX = 'sigevents-streams-features';

const SIGEVENTS_KNOWLEDGE_INDICATORS_PREFIX = 'sigevents-knowledge-indicators';
const SIGEVENTS_DISCOVERIES_TEMP_INDEX_PREFIX = 'sigevents-discoveries';
const SIGEVENTS_DETECTIONS_TEMP_INDEX_PREFIX = 'sigevents-detections';
export const SIGEVENTS_DISCOVERIES_DATA_STREAM = `.significant_events-discoveries`;
export const SIGEVENTS_DETECTIONS_DATA_STREAM = `.significant_events-detections`;
export const SIGEVENTS_EVENTS_DATA_STREAM = '.significant_events-events';
export const SIGEVENTS_KNOWLEDGE_INDICATORS_DATA_STREAM =
  '.significant_events-knowledge_indicators';
export const SIGEVENTS_FEATURES_TEMP_INDEX_PATTERN = `${SIGEVENTS_FEATURES_TEMP_INDEX_PREFIX}-*`;
export const SIGEVENTS_DISCOVERIES_TEMP_INDEX_PATTERN = `${SIGEVENTS_DISCOVERIES_TEMP_INDEX_PREFIX}-*`;
export const SIGEVENTS_DETECTIONS_TEMP_INDEX_PATTERN = `${SIGEVENTS_DETECTIONS_TEMP_INDEX_PREFIX}-*`;
export const SIGEVENTS_KNOWLEDGE_INDICATORS_TEMP_INDEX_PATTERN = `${SIGEVENTS_KNOWLEDGE_INDICATORS_PREFIX}-*`;

const getSigeventsSnapshotIndex =
  (root: string) =>
  (snapshotName: string): string => {
    const component = sanitizeIndexComponent(snapshotName) || 'unknown';
    return `${root}-${component}`;
  };

export const getSigeventsSnapshotDetectionsIndex = getSigeventsSnapshotIndex(
  SIGEVENTS_DETECTIONS_TEMP_INDEX_PREFIX
);
export const getSigeventsSnapshotKIFeaturesIndex = getSigeventsSnapshotIndex(
  SIGEVENTS_FEATURES_TEMP_INDEX_PREFIX
);
export const getSigeventsSnapshotDiscoveriesIndex = getSigeventsSnapshotIndex(
  SIGEVENTS_DISCOVERIES_TEMP_INDEX_PREFIX
);
export const getSigeventsSnapshotKnowledgeIndicatorsIndex = getSigeventsSnapshotIndex(
  SIGEVENTS_KNOWLEDGE_INDICATORS_PREFIX
);
