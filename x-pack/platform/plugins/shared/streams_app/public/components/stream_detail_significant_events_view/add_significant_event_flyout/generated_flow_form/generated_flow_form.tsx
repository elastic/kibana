/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiLink,
  EuiLoadingSpinner,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { StreamQueryKql, Streams } from '@kbn/streams-schema';
import React, { useEffect, useState } from 'react';
import { v4 } from 'uuid';
import { useKibana } from '../../../../hooks/use_kibana';
import { useSignificantEventsApi } from '../../../../hooks/use_significant_events_api';
import { useAIFeatures } from '../../common/use_ai_features';
import { SignificantEventsGeneratedTable } from './significant_events_generated_table';

interface Props {
  definition: Streams.all.Definition;
  isSubmitting: boolean;
  setQueries: (queries: StreamQueryKql[]) => void;
  setCanSave: (canSave: boolean) => void;
}

export function GeneratedFlowForm({ setQueries, definition, setCanSave, isSubmitting }: Props) {
  const {
    core: { notifications, http },
  } = useKibana();
  const aiFeatures = useAIFeatures();
  const { generate } = useSignificantEventsApi({ name: definition.name });

  const toggleMethodSwitchId = useGeneratedHtmlId();

  const [method, setMethod] = useState<'log_patterns' | 'zero_shot'>('log_patterns');
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

      {aiFeatures.loading && <EuiLoadingSpinner size="m" />}

      {!aiFeatures.loading && !aiFeatures.enabled && (
        <EuiToolTip
          content={i18n.translate(
            'xpack.streams.addSignificantEventFlyout.aiFlow.aiAssistantNotEnabledTooltip',
            {
              defaultMessage:
                'AI Assistant features are not enabled. To enable features, add an AI connector on the management page.',
            }
          )}
        >
          {aiFeatures.couldBeEnabled ? (
            <EuiLink
              target="_blank"
              href={http.basePath.prepend(
                `/app/management/insightsAndAlerting/triggersActionsConnectors/connectors`
              )}
            >
              {i18n.translate(
                'xpack.streams.addSignificantEventFlyout.aiFlow.aiAssistantNotEnabled',
                { defaultMessage: 'Enable AI Assistant features' }
              )}
            </EuiLink>
          ) : (
            <EuiText>
              <h3>
                {i18n.translate(
                  'xpack.streams.addSignificantEventFlyout.aiFlow.aiAssistantNotEnabledAskAdmin',
                  { defaultMessage: 'Ask your administrator to enable AI Assistant features' }
                )}
              </h3>
            </EuiText>
          )}
        </EuiToolTip>
      )}

      {!aiFeatures.loading && aiFeatures.enabled && (
        <>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiSwitch
              label={
                method === 'log_patterns'
                  ? 'Use log patterns'
                  : 'Use zero shot based on identified system features'
              }
              checked={method === 'log_patterns'}
              onChange={() => setMethod(method === 'log_patterns' ? 'zero_shot' : 'log_patterns')}
              aria-describedby={toggleMethodSwitchId}
              compressed
            />
            <EuiButton
              isLoading={isGenerating}
              disabled={
                isSubmitting ||
                isGenerating ||
                !aiFeatures ||
                !aiFeatures.enabled ||
                !aiFeatures.selectedConnector
              }
              iconType="sparkles"
              onClick={() => {
                setIsGenerating(true);
                setGeneratedQueries([]);
                setSelectedQueries([]);

                const generation$ = generate(aiFeatures?.selectedConnector!, method);
                generation$.subscribe({
                  next: (result) => {
                    setGeneratedQueries((prev) => [
                      ...prev,
                      { id: v4(), kql: { query: result.query.kql }, title: result.query.title },
                    ]);
                  },
                  error: (error) => {
                    notifications.showErrorDialog({
                      title: i18n.translate(
                        'xpack.streams.addSignificantEventFlyout.aiFlow.generateErrorToastTitle',
                        { defaultMessage: `Could not generate significant events queries` }
                      ),
                      error,
                    });
                    setIsGenerating(false);
                  },
                  complete: () => {
                    notifications.toasts.addSuccess({
                      title: i18n.translate(
                        'xpack.streams.addSignificantEventFlyout.aiFlow.generateSuccessToastTitle',
                        { defaultMessage: `Generated significant events queries successfully` }
                      ),
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
