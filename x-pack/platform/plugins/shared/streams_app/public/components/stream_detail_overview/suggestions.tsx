/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import { EuiListGroup, EuiListGroupItem, EuiPanel, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { StreamSuggestion } from '@kbn/streams-ai';
import { useStreamsSuggestionsApi } from '../../hooks/use_streams_suggestions_api';
import { useAIFeatures } from '../../hooks/use_ai_features';
import { useTimeRange } from '../../hooks/use_time_range';

export function SuggestionsPanel({ streamName }: { streamName: string }) {
  const { getStreamSuggestions } = useStreamsSuggestionsApi();
  const [suggestions, setSuggestions] = useState<StreamSuggestion[]>([]);

  const { startMs, endMs } = useTimeRange();

  const useAiFeatures = useAIFeatures();

  const selectedConnector = (useAiFeatures?.genAiConnectors.connectors || []).find(
    (connector) => connector.connectorId === useAiFeatures?.genAiConnectors.selectedConnector
  );

  useEffect(() => {
    getStreamSuggestions({
      streamName,
      connectorId: selectedConnector?.connectorId || '',
      start: startMs,
      end: endMs,
    }).then((response) => {
      setSuggestions(response.suggestions);
    });
  }, [streamName, selectedConnector, getStreamSuggestions, startMs, endMs]);

  return (
    <EuiPanel hasBorder hasShadow={false}>
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.streams.streamOverview.suggestionsPanel.title', {
            defaultMessage: 'Suggestions',
          })}
        </h3>
      </EuiTitle>

      <EuiListGroup>
        {suggestions.map((suggestion) => (
          <EuiListGroupItem
            key={suggestion.title}
            label={
              <>
                {suggestion.title}
                <EuiText size="s" color="subdued">
                  <p>{suggestion.description}</p>
                </EuiText>
              </>
            }
          />
        ))}
      </EuiListGroup>
    </EuiPanel>
  );
}
