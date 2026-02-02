/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut } from '@elastic/eui';
import type { StreamQueryKql, System } from '@kbn/streams-schema';
import type { Streams } from '@kbn/streams-schema';
import React, { useEffect, useState } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { SignificantEventsGeneratedTable } from './significant_events_generated_table';
import { AiFlowEmptyState } from './empty_state';
import { AiFlowWaitingForGeneration } from './waiting_for_generation';

interface Props {
  isGenerating: boolean;
  isBeingCanceled: boolean;
  generatedQueries: StreamQueryKql[];
  onEditQuery: (query: StreamQueryKql) => void;
  stopGeneration: () => void;
  definition: Streams.all.Definition;
  isSubmitting: boolean;
  setQueries: (queries: StreamQueryKql[]) => void;
  setCanSave: (canSave: boolean) => void;
  systems: Omit<System, 'description'>[];
  dataViews: DataView[];
  taskStatus?: string;
  taskError?: string;
}

export function GeneratedFlowForm({
  isGenerating,
  isBeingCanceled,
  generatedQueries,
  onEditQuery,
  stopGeneration,
  setQueries,
  definition,
  setCanSave,
  isSubmitting,
  systems,
  dataViews,
  taskStatus,
  taskError,
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

  if (!isGenerating && (taskStatus === 'failed' || taskStatus === 'stale')) {
    const isFailed = taskStatus === 'failed';
    return (
      <EuiCallOut
        announceOnMount
        title={
          isFailed
            ? i18n.translate(
                'xpack.streams.streamDetailView.addSignificantEventFlyout.generationFailedTitle',
                { defaultMessage: 'Generation failed' }
              )
            : i18n.translate(
                'xpack.streams.streamDetailView.addSignificantEventFlyout.generationStaleTitle',
                { defaultMessage: 'Generation timed out' }
              )
        }
        color={isFailed ? 'danger' : 'warning'}
        iconType={isFailed ? 'error' : 'warning'}
      >
        {isFailed
          ? taskError
          : i18n.translate(
              'xpack.streams.streamDetailView.addSignificantEventFlyout.generationStaleDescription',
              { defaultMessage: 'The generation task took too long and was marked as stale.' }
            )}
      </EuiCallOut>
    );
  }

  if (!isGenerating && generatedQueries.length === 0) {
    return <AiFlowEmptyState />;
  }

  if (isGenerating && generatedQueries.length === 0) {
    return (
      <AiFlowWaitingForGeneration
        stopGeneration={stopGeneration}
        isBeingCanceled={isBeingCanceled}
      />
    );
  }

  if (!isGenerating && generatedQueries.length === 0) {
    return <AiFlowEmptyState />;
  }

  if (isGenerating && generatedQueries.length === 0) {
    return (
      <AiFlowWaitingForGeneration
        stopGeneration={stopGeneration}
        isBeingCanceled={isBeingCanceled}
      />
    );
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
        <AiFlowWaitingForGeneration
          stopGeneration={stopGeneration}
          hasInitialResults={true}
          isBeingCanceled={isBeingCanceled}
        />
      )}
    </>
  );
}
