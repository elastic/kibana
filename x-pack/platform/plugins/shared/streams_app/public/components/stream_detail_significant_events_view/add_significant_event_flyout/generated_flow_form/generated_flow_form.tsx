/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { StreamQueryKql } from '@kbn/streams-schema';
import { Streams } from '@kbn/streams-schema';
import React, { useEffect, useState } from 'react';
import { v4 } from 'uuid';
import { useKibana } from '../../../../hooks/use_kibana';
import { useSignificantEventsApi } from '../../../../hooks/use_significant_events_api';
import { validateQuery } from '../common/validate_query';
import { AIConnectorSelector } from './ai_connector_selector';
import { AIFeaturesDisabledCallout } from './ai_features_disabled_callout';
import { SignificantEventsGeneratedTable } from './significant_events_generated_table';
import { useAIFeatures } from './use_ai_features';

interface Props {
  definition: Streams.all.Definition;
  isSubmitting: boolean;
  setQueries: (queries: StreamQueryKql[]) => void;
  setCanSave: (canSave: boolean) => void;
}

export function GeneratedFlowForm({ setQueries, definition, setCanSave, isSubmitting }: Props) {
  const {
    core: { notifications },
    services: { telemetryClient },
  } = useKibana();
  const aiFeatures = useAIFeatures();
  const { generate } = useSignificantEventsApi({ name: definition.name });

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQueries, setGeneratedQueries] = useState<StreamQueryKql[]>([]);
  const [selectedQueries, setSelectedQueries] = useState<StreamQueryKql[]>([]);

  const onSelectionChange = (selectedItems: StreamQueryKql[]) => {
    setSelectedQueries(selectedItems);
    setQueries(selectedItems);
  };

  useEffect(() => {
    setCanSave(selectedQueries.length > 0);
  }, [selectedQueries, setCanSave]);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.streams.addSignificantEventFlyout.aiFlow.generatedFlowFormTitle', {
            defaultMessage: 'Suggested significant events',
          })}
        </h3>
      </EuiTitle>

      {aiFeatures && !aiFeatures.enabled && !aiFeatures.genAiConnectors.loading && (
        <AIFeaturesDisabledCallout couldBeEnabled={aiFeatures?.couldBeEnabled ?? false} />
      )}

      {aiFeatures && aiFeatures.enabled && (
        <>
          <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButton
                isLoading={isGenerating}
                size="s"
                disabled={
                  isSubmitting || isGenerating || !aiFeatures.genAiConnectors.selectedConnector
                }
                iconType="sparkles"
                onClick={() => {
                  const startTime = Date.now();

                  setIsGenerating(true);
                  setGeneratedQueries([]);
                  setSelectedQueries([]);

                  const generation$ = generate(aiFeatures.genAiConnectors.selectedConnector!);
                  generation$.subscribe({
                    next: (result) => {
                      const validation = validateQuery({
                        title: result.query.title,
                        kql: { query: result.query.kql },
                      });

                      if (!validation.kql.isInvalid) {
                        setGeneratedQueries((prev) => [
                          ...prev,
                          { id: v4(), kql: { query: result.query.kql }, title: result.query.title },
                        ]);
                      }
                    },
                    error: (error) => {
                      setIsGenerating(false);
                      if (error.name === 'AbortError') {
                        return;
                      }

                      notifications.showErrorDialog({
                        title: i18n.translate(
                          'xpack.streams.addSignificantEventFlyout.aiFlow.generateErrorToastTitle',
                          { defaultMessage: `Could not generate significant events queries` }
                        ),
                        error,
                      });
                    },
                    complete: () => {
                      notifications.toasts.addSuccess({
                        title: i18n.translate(
                          'xpack.streams.addSignificantEventFlyout.aiFlow.generateSuccessToastTitle',
                          { defaultMessage: `Generated significant events queries successfully` }
                        ),
                      });
                      telemetryClient.trackSignificantEventsSuggestionsGenerate({
                        duration_ms: Date.now() - startTime,
                        stream_type: Streams.WiredStream.Definition.is(definition)
                          ? 'wired'
                          : 'classic',
                      });
                      setIsGenerating(false);
                    },
                  });
                }}
              >
                {isGenerating
                  ? i18n.translate(
                      'xpack.streams.addSignificantEventFlyout.aiFlow.generatingButtonLabel',
                      { defaultMessage: 'Generating...' }
                    )
                  : i18n.translate(
                      'xpack.streams.addSignificantEventFlyout.aiFlow.generateButtonLabel',
                      {
                        defaultMessage: 'Generate',
                      }
                    )}
              </EuiButton>
            </EuiFlexItem>
            <AIConnectorSelector
              genAiConnectors={aiFeatures.genAiConnectors}
              disabled={isSubmitting || isGenerating}
            />
          </EuiFlexGroup>

          <SignificantEventsGeneratedTable
            isSubmitting={isSubmitting}
            generatedQueries={generatedQueries}
            selectedQueries={selectedQueries}
            onSelectionChange={onSelectionChange}
            definition={definition}
          />
        </>
      )}
    </EuiFlexGroup>
  );
}
