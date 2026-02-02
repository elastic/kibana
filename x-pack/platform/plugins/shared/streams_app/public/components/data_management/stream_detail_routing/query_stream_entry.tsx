/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButtonIcon,
  EuiPanel,
  useEuiTheme,
  EuiLink,
  EuiSkeletonText,
  EuiCodeBlock,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import { css as cssReact } from '@emotion/react';
import { Streams, getEsqlViewName, isChildOf } from '@kbn/streams-schema';
import { useDebounceFn } from '@kbn/react-hooks';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useKibana } from '../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { InlineQueryStreamForm } from '../../query_streams/inline_query_stream_form';
import {
  useStreamRoutingEvents,
  useStreamsRoutingSelector,
} from './state_management/stream_routing_state_machine';
import { useQueryStreamCreation } from './query_stream_creation_context';
import { QueryStreamBadge } from '../../stream_badges';

interface IdleQueryStreamEntryProps {
  streamName: string;
  onEdit?: (name: string) => void;
}

/**
 * Displays an existing query stream in idle state
 */
export function IdleQueryStreamEntry({ streamName, onEdit }: IdleQueryStreamEntryProps) {
  const { euiTheme } = useEuiTheme();
  const router = useStreamsAppRouter();

  const { streamsRepositoryClient } = useKibana().dependencies.start.streams;

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

  const esqlQuery =
    streamDetailsFetch.value && Streams.QueryStream.GetResponse.is(streamDetailsFetch.value)
      ? streamDetailsFetch.value.stream.query.esql
      : `FROM ${getEsqlViewName(streamName)}`;

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      data-test-subj={`queryStream-${streamName}`}
      className={css`
        overflow: hidden;
        border: ${euiTheme.border.thin};
        padding: ${euiTheme.size.m} 16px;
        border-radius: ${euiTheme.size.s};
      `}
    >
      {streamDetailsFetch.loading || !streamDetailsFetch.value ? (
        <EuiSkeletonText lines={3} />
      ) : (
        <EuiFlexGroup direction="column" gutterSize="xs">
          <EuiFlexGroup
            justifyContent="spaceBetween"
            alignItems="center"
            gutterSize="s"
            responsive={false}
          >
            <EuiLink
              href={router.link('/{key}/management/{tab}', {
                path: { key: streamDetailsFetch.value.stream.name, tab: 'partitioning' },
              })}
              data-test-subj="streamsAppQueryStreamEntryButton"
              css={cssReact`
              min-width: 0;
            `}
            >
              <EuiText
                size="xs"
                component="p"
                className="eui-textTruncate"
                css={cssReact`
                font-weight: ${euiTheme.font.weight.bold};
              `}
              >
                {streamDetailsFetch.value.stream.name}
              </EuiText>
            </EuiLink>
            <EuiFlexItem grow />
            <QueryStreamBadge />
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
          <EuiFlexItem
            grow={false}
            className={css`
              overflow: hidden;
              padding: ${euiTheme.size.xs} 0px;
            `}
          >
            <EuiCodeBlock
              language="esql"
              paddingSize="m"
              fontSize="m"
              css={css`
                min-height: 100px;
              `}
            >
              {esqlQuery}
            </EuiCodeBlock>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
    </EuiPanel>
  );
}

interface CreatingQueryStreamEntryProps {
  parentStreamName: string;
}

const deboucingOptions = { wait: 500 };

/**
 * Inline form for creating a new query stream within the routing page.
 * This component manages its own form state and uses the query stream creation context
 * for preview data, keeping the state machine integration minimal.
 */
export function CreatingQueryStreamEntry({ parentStreamName }: CreatingQueryStreamEntryProps) {
  const { cancelQueryStreamCreation, saveQueryStream } = useStreamRoutingEvents();
  const { executeQuery } = useQueryStreamCreation();

  const isSaving = useStreamsRoutingSelector((state) =>
    state.matches({ ready: { queryMode: { creating: 'saving' } } })
  );

  // Debounced query execution for preview
  const { run: debouncedExecuteQuery } = useDebounceFn((query: string) => {
    if (query && query.trim() !== '') {
      executeQuery(query);
    }
  }, deboucingOptions);

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
      saveQueryStream({ name: fullName, esqlQuery });
    },
    [parentStreamName, saveQueryStream]
  );

  return (
    <InlineQueryStreamForm
      parentStreamName={parentStreamName}
      initialEsqlQuery={`FROM ${getEsqlViewName(parentStreamName)}`}
      onSave={handleSave}
      onCancel={cancelQueryStreamCreation}
      onQueryChange={debouncedExecuteQuery}
      isSaving={isSaving}
    />
  );
}
