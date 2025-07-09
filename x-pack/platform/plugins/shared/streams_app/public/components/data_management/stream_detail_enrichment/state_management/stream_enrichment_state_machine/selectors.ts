/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StreamEnrichmentContextType } from './types';

/**
 * Selects the processor marked as the draft processor.
 */
export const selectDraftProcessor = (context: StreamEnrichmentContextType) => {
  const draft = context.processorsRefs.find((p) => p.getSnapshot().matches('draft'));
  return {
    processor: draft?.getSnapshot().context.processor,
    resources: draft?.getSnapshot().context.resources,
  };
};
