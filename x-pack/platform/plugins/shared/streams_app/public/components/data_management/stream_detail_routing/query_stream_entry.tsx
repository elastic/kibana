/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiBadge,
  EuiButtonIcon,
  EuiCode,
  EuiPanel,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import { Streams, getEsqlViewName, isChildOf } from '@kbn/streams-schema';
import { useDebounceFn } from '@kbn/react-hooks';
import { useKibana } from '../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { NestedView } from '../../nested_view';
import { InlineQueryStreamForm } from '../../query_streams/inline_query_stream_form';
import {
  useStreamRoutingEvents,
  useStreamsRoutingSelector,
} from './state_management/stream_routing_state_machine';
import { useQueryStreamCreation } from './query_stream_creation_context';

interface IdleQueryStreamEntryProps {
  streamName: string;
  onEdit?: (name: string) => void;
  isLast: boolean;
  isFirst: boolean;
}

/**
 * Displays an existing query stream in idle state
 */
export function IdleQueryStreamEntry({
  streamName,
  onEdit,
  isLast,
  isFirst,
}: IdleQueryStreamEntryProps) {
  const { euiTheme } = useEuiTheme();
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  // Fetch the full stream details to get the ES|QL query
  const streamDetailsFetch = useStreamsAppFetch(
    ({ signal }) => {
      return streamsRepositoryClient.fetch('GET /api/streams/{name} 2023-10-31', {
        signal,
        params: { path: { name: streamName } },
      });
    },
    [streamsRepositoryClient, streamName]
  );

  const viewName = getEsqlViewName(streamName);
  const esqlQuery =
    streamDetailsFetch.value && Streams.QueryStream.GetResponse.is(streamDetailsFetch.value)
      ? streamDetailsFetch.value.stream.query.esql
      : `FROM ${viewName}`;

  return (
    <NestedView last={isLast} first={isFirst}>
      <EuiPanel
        color="subdued"
        hasShadow={false}
        hasBorder
        paddingSize="m"
        className={css`
          display: flex;
          flex-direction: column;
          gap: ${euiTheme.size.s};
        `}
      >
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <strong>{streamName}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              {i18n.translate('xpack.streams.queryStreamEntry.queryStreamBadge', {
                defaultMessage: 'Query stream',
              })}
            </EuiBadge>
          </EuiFlexItem>
          <EuiFlexItem grow />
          {onEdit && (
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="pencil"
                aria-label={i18n.translate('xpack.streams.queryStreamEntry.editButtonAriaLabel', {
                  defaultMessage: 'Edit query stream',
                })}
                onClick={() => onEdit(streamName)}
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
        <EuiCode
          language="sql"
          className={css`
            white-space: pre-wrap;
            word-break: break-word;
          `}
        >
          {streamDetailsFetch.loading ? '...' : esqlQuery}
        </EuiCode>
      </EuiPanel>
    </NestedView>
  );
}

interface CreatingQueryStreamEntryProps {
  parentStreamName: string;
}

const DEBOUNCE_DELAY_MS = 500;

/**
 * Inline form for creating a new query stream within the routing page.
 * This component manages its own form state and uses the query stream creation context
 * for preview data, keeping the state machine integration minimal.
 */
export function CreatingQueryStreamEntry({ parentStreamName }: CreatingQueryStreamEntryProps) {
  const { cancelQueryStreamCreation, saveQueryStream } = useStreamRoutingEvents();
  const { executeQuery } = useQueryStreamCreation();

  const isSaving = useStreamsRoutingSelector((state) =>
    state.matches({ ready: { queryMode: 'saving' } })
  );

  // Track the current query to execute previews
  const currentQueryRef = useRef<string>('');

  // Debounced query execution for preview
  const { run: debouncedExecuteQuery } = useDebounceFn(
    (query: string) => {
      if (query && query.trim() !== '') {
        executeQuery(query);
      }
    },
    { wait: DEBOUNCE_DELAY_MS }
  );

  // Execute initial query on mount
  useEffect(() => {
    const initialQuery = `FROM ${getEsqlViewName(parentStreamName)}`;
    currentQueryRef.current = initialQuery;
    executeQuery(initialQuery);
  }, [parentStreamName, executeQuery]);

  // Handle query changes - execute debounced preview
  const handleQueryChange = useCallback(
    (esqlQuery: string) => {
      currentQueryRef.current = esqlQuery;
      debouncedExecuteQuery(esqlQuery);
    },
    [debouncedExecuteQuery]
  );

  // Validate and save the query stream
  const handleSave = useCallback(
    ({ name, esqlQuery }: { name: string; esqlQuery: string }) => {
      // Validate name follows child naming convention
      const fullName = `${parentStreamName}.${name}`;
      if (!name || name.trim() === '' || !isChildOf(parentStreamName, fullName)) {
        return;
      }
      if (!esqlQuery || esqlQuery.trim() === '') {
        return;
      }
      // Trigger save with the form data
      saveQueryStream({ name, esqlQuery });
    },
    [parentStreamName, saveQueryStream]
  );

  return (
    <InlineQueryStreamForm
      parentStreamName={parentStreamName}
      initialName=""
      initialEsqlQuery={`FROM ${getEsqlViewName(parentStreamName)}`}
      onSave={handleSave}
      onCancel={cancelQueryStreamCreation}
      onQueryChange={handleQueryChange}
      isSaving={isSaving}
      isFirst={false}
      isLast={true}
    />
  );
}
