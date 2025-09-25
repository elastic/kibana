/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamQueryKql } from '@kbn/streams-schema';
import type { Streams } from '@kbn/streams-schema';
import React, { useEffect, useState } from 'react';
import { SignificantEventsGeneratedTable } from './significant_events_generated_table';
import { AiFlowEmptyState } from './empty_state';
import { AiFlowWaitingForGeneration } from './waiting_for_generation';

interface Props {
  isGenerating: boolean;
  generatedQueries: StreamQueryKql[];
  stopGeneration: () => void;

  definition: Streams.all.Definition;
  isSubmitting: boolean;
  setQueries: (queries: StreamQueryKql[]) => void;
  setCanSave: (canSave: boolean) => void;
}

export function GeneratedFlowForm({
  isGenerating,
  generatedQueries,
  stopGeneration,
  setQueries,
  definition,
  setCanSave,
  isSubmitting,
}: Props) {
  const [selectedQueries, setSelectedQueries] = useState<StreamQueryKql[]>([]);

  const onSelectionChange = (selectedItems: StreamQueryKql[]) => {
    setSelectedQueries(selectedItems);
    setQueries(selectedItems);
  };

  useEffect(() => {
    setCanSave(selectedQueries.length > 0);
  }, [selectedQueries, setCanSave]);

  if (!isGenerating && generatedQueries.length === 0) {
    return <AiFlowEmptyState />;
  }

  if (isGenerating) {
    return <AiFlowWaitingForGeneration stopGeneration={stopGeneration} />;
  }

  return (
    <SignificantEventsGeneratedTable
      isSubmitting={isSubmitting}
      generatedQueries={generatedQueries}
      selectedQueries={selectedQueries}
      onSelectionChange={onSelectionChange}
      definition={definition}
    />
  );
}
