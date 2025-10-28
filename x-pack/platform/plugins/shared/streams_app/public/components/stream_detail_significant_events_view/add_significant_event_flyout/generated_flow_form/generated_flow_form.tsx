/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamQueryKql, System } from '@kbn/streams-schema';
import type { Streams } from '@kbn/streams-schema';
import React, { useEffect, useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { SignificantEventsGeneratedTable } from './significant_events_generated_table';
import { AiFlowEmptyState } from './empty_state';
import { AiFlowWaitingForGeneration } from './waiting_for_generation';

interface Props {
  isGenerating: boolean;
  generatedQueries: StreamQueryKql[];
  onEditQuery: (query: StreamQueryKql) => void;
  stopGeneration: () => void;
  definition: Streams.all.Definition;
  isSubmitting: boolean;
  setQueries: (queries: StreamQueryKql[]) => void;
  setCanSave: (canSave: boolean) => void;
  systems: Omit<System, 'description'>[];
  dataViews: DataView[];
}

export function GeneratedFlowForm({
  isGenerating,
  generatedQueries,
  onEditQuery,
  stopGeneration,
  setQueries,
  definition,
  setCanSave,
  isSubmitting,
  systems,
  dataViews,
}: Props) {
  const [selectedQueries, setSelectedQueries] = useState<StreamQueryKql[]>([]);
  const [isEditingQueries, setIsEditingQueries] = useState(false);

  const onSelectionChange = (selectedItems: StreamQueryKql[]) => {
    setSelectedQueries(selectedItems);
    setQueries(selectedItems);
  };

  useEffect(() => {
    setCanSave(!isEditingQueries && selectedQueries.length > 0);
  }, [selectedQueries, isEditingQueries, setCanSave]);

  if (!isGenerating && generatedQueries.length === 0) {
    return <AiFlowEmptyState />;
  }

  if (isGenerating && generatedQueries.length === 0) {
    return <AiFlowWaitingForGeneration stopGeneration={stopGeneration} />;
  }

  if (!isGenerating && generatedQueries.length === 0) {
    return <AiFlowEmptyState />;
  }

  if (isGenerating && generatedQueries.length === 0) {
    return <AiFlowWaitingForGeneration stopGeneration={stopGeneration} />;
  }

  return (
    <>
      <SignificantEventsGeneratedTable
        setIsEditingQueries={setIsEditingQueries}
        isSubmitting={isSubmitting}
        generatedQueries={generatedQueries}
        onEditQuery={onEditQuery}
        selectedQueries={selectedQueries}
        onSelectionChange={onSelectionChange}
        definition={definition}
        systems={systems}
        dataViews={dataViews}
      />
      {isGenerating && (
        <AiFlowWaitingForGeneration stopGeneration={stopGeneration} hasInitialResults={true} />
      )}
    </>
  );
}
