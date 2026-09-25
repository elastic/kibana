/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useStreamEnrichmentEvents } from '../state_management/stream_enrichment_state_machine';

export const useAddStepActions = () => {
  const { addProcessor } = useStreamEnrichmentEvents();

  const onAddProcessor = useCallback(
    () => addProcessor(undefined, { parentId: null }),
    [addProcessor]
  );

  return { onAddProcessor };
};
