/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { createSelector } from 'reselect';
import { filterSimulationDocuments } from './utils';
import { SimulationActorSnapshot } from './simulation_state_machine';

const EMPTY_ARRAY: [] = [];

export const selectPreviewDocuments = createSelector(
  [
    (snapshot: SimulationActorSnapshot['context']) => snapshot.samples,
    (snapshot: SimulationActorSnapshot['context']) => snapshot.previewDocsFilter,
    (snapshot: SimulationActorSnapshot['context']) => snapshot.simulation?.documents,
  ],
  (samples, previewDocsFilter, documents) => {
    return (
      (previewDocsFilter && documents
        ? filterSimulationDocuments(documents, previewDocsFilter)
        : samples) || EMPTY_ARRAY
    );
  }
);
