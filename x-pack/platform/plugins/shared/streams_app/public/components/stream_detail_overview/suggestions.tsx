/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiHorizontalRule,
  EuiMarkdownFormat,
  EuiPanel,
  EuiSkeletonText,
  EuiSkeletonTitle,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { StreamSuggestion } from '@kbn/streams-ai';

import { AiButton } from '@kbn/shared-ux-ai-components';
import { useStreamsSuggestionsApi } from '../../hooks/use_streams_suggestions_api';
import { useAIFeatures } from '../../hooks/use_ai_features';
import { useTimeRange } from '../../hooks/use_time_range';
import { useStreamingText } from '../../hooks/use_streaming_test';

export function SuggestionsPanel({ streamName }: { streamName: string }) {
  const useAiFeatures = useAIFeatures();
  const { streamSuggestions } = useStreamsSuggestionsApi();

  const [suggestions, setSuggestions] = useState<StreamSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Tracks how many suggestions existed at the start of the current load batch,
  // so the skeleton count stays relative to the new batch rather than the total.
  const [loadingBaseCount, setLoadingBaseCount] = useState(0);
  // Incrementing this re-triggers the stream effect.
  const [loadKey, setLoadKey] = useState(0);
  // True when the next effect run should append rather than replace suggestions.
  const appendRef = useRef(false);
  // Snapshot of suggestions.length captured at "Load more" click time.
  const baseCountRef = useRef(0);

  const { startMs, endMs } = useTimeRange();

  const selectedConnectorId = useAiFeatures?.genAiConnectors.selectedConnector;

  useEffect(() => {
    if (!selectedConnectorId) return;

    const isAppend = appendRef.current;
    appendRef.current = false;

    if (!isAppend) {
      setSuggestions([]);
      setLoadingBaseCount(0);
    } else {
      setLoadingBaseCount(baseCountRef.current);
    }
    setIsLoading(true);

    const abortController = new AbortController();

    const subscription = streamSuggestions({
      streamName,
      connectorId: selectedConnectorId,
      start: startMs,
      end: endMs,
      signal: abortController.signal,
    }).subscribe({
      next: (suggestion) => {
        if (suggestion !== null) {
          setSuggestions((prev) => [...prev, suggestion]);
        }
      },
      error: (err) => {
        setIsLoading(false);
        if (err?.name !== 'AbortError') {
          // eslint-disable-next-line no-console
          console.error('Failed to load suggestions', err);
        }
      },
      complete: () => {
        setIsLoading(false);
      },
    });

    return () => {
      abortController.abort();
      subscription.unsubscribe();
    };
  }, [streamName, selectedConnectorId, streamSuggestions, startMs, endMs, loadKey]);

  const onLoadMore = useCallback(() => {
    appendRef.current = true;
    baseCountRef.current = suggestions.length;
    setLoadKey((k) => k + 1);
  }, [suggestions.length]);

  const MAX_VISIBLE_SKELETONS = 3;
  const pendingCount = isLoading
    ? Math.max(0, loadingBaseCount + MAX_VISIBLE_SKELETONS - suggestions.length)
    : 0;

  return (
    <EuiPanel hasBorder hasShadow={false}>
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.streams.streamOverview.suggestionsPanel.title', {
            defaultMessage: 'Suggestions',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />

      {suggestions.map((suggestion) => (
        <SuggestionItem key={suggestion.title} suggestion={suggestion} />
      ))}
      {Array.from({ length: pendingCount }, (_, i) => (
        <SuggestionSkeleton key={i} />
      ))}

      <EuiButtonEmpty
        size="s"
        type="button"
        iconType="refresh"
        iconSide="left"
        isLoading={isLoading}
        isDisabled={isLoading}
        onClick={onLoadMore}
        css={css`
          margin-top: -4px;
        `}
      >
        {i18n.translate('xpack.streams.suggestionItem.loadMoreButtonLabel', {
          defaultMessage: 'Load more',
        })}
      </EuiButtonEmpty>
    </EuiPanel>
  );
}

function SuggestionSkeleton() {
  return (
    <div>
      <EuiSkeletonTitle size="xxxs" isLoading />
      <EuiSpacer size="s" />
      <EuiSkeletonText lines={2} isLoading />
      <EuiSpacer size="xs" />
      <EuiHorizontalRule />
      <EuiSpacer size="xs" />
    </div>
  );
}

function SuggestionItem({ suggestion }: { suggestion: StreamSuggestion }) {
  const { displayed: title, isComplete: isTitleComplete } = useStreamingText(suggestion.title);
  const { displayed: description, isComplete: isDescriptionComplete } = useStreamingText(
    suggestion.description
  );

  const isComplete = isTitleComplete && isDescriptionComplete;

  return (
    <div>
      <EuiSkeletonTitle size="xxxs" isLoading={title === ''}>
        <EuiTitle size="xxxs">
          <h4>{title}</h4>
        </EuiTitle>
      </EuiSkeletonTitle>
      <EuiSpacer size="m" />
      <EuiSkeletonText lines={2} isLoading={description === ''}>
        <EuiMarkdownFormat textSize="s" color="subdued">
          {description}
        </EuiMarkdownFormat>
      </EuiSkeletonText>
      <EuiSpacer size="m" />
      <AiButton size="s" iconType="sparkles" variant="base" disabled={!isComplete}>
        {suggestion.type === 'attach_dashboard'
          ? i18n.translate('xpack.streams.suggestionsPanel.aiButton.attachDashboardLabel', {
              defaultMessage: 'Review dashboards',
            })
          : ''}
        {suggestion.type === 'reduce_log_volume'
          ? i18n.translate('xpack.streams.suggestionsPanel.aiButton.improveParsingLabel', {
              defaultMessage: 'Review processor',
            })
          : ''}
        {suggestion.type === 'improve_parsing'
          ? i18n.translate('xpack.streams.suggestionsPanel.aiButton.improveParsingLabel', {
              defaultMessage: 'Review processor',
            })
          : ''}
        {suggestion.type === 'partition_stream'
          ? i18n.translate('xpack.streams.suggestionsPanel.aiButton.partitionStreamLabel', {
              defaultMessage: 'Review partition',
            })
          : ''}
      </AiButton>
      <EuiButtonEmpty size="s" type="button" disabled={!isComplete} onClick={() => {}}>
        {i18n.translate('xpack.streams.suggestionItem.dismissButtonLabel', {
          defaultMessage: 'Dismiss',
        })}
      </EuiButtonEmpty>
      <EuiHorizontalRule />
    </div>
  );
}
