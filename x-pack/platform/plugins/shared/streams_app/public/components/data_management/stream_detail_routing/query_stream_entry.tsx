/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButton,
  EuiButtonEmpty,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  EuiBadge,
  EuiButtonIcon,
  EuiCode,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import type { AggregateQuery } from '@kbn/es-query';
import { ESQLLangEditor } from '@kbn/esql/public';
import { Streams, getEsqlViewName } from '@kbn/streams-schema';
import { useKibana } from '../../../hooks/use_kibana';
import { useStreamsAppFetch } from '../../../hooks/use_streams_app_fetch';
import { NestedView } from '../../nested_view';
import { StreamNameFormRow } from '../../stream_name_form_row';
import {
  useQueryStreamForm,
  useStreamRoutingEvents,
  useIsQueryModeSaving,
} from './state_management/stream_routing_state_machine';

interface IdleQueryStreamEntryProps {
  streamDefinition: Streams.QueryStream.Definition;
  onEdit?: (name: string) => void;
  isLast: boolean;
  isFirst: boolean;
}

/**
 * Displays an existing query stream in idle state
 */
export function IdleQueryStreamEntry({
  streamDefinition,
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
        params: { path: { name: streamDefinition.name } },
      });
    },
    [streamsRepositoryClient, streamDefinition.name]
  );

  const esqlQuery =
    streamDetailsFetch.value && Streams.QueryStream.GetResponse.is(streamDetailsFetch.value)
      ? streamDetailsFetch.value.stream.query.esql
      : `FROM ${streamDefinition.query.view}`;

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
              <strong>{streamDefinition.name}</strong>
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
                onClick={() => onEdit(streamDefinition.name)}
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

/**
 * Inline form for creating a new query stream
 */
export function CreatingQueryStreamEntry({ parentStreamName }: CreatingQueryStreamEntryProps) {
  const { euiTheme } = useEuiTheme();
  const {
    cancelQueryStreamCreation,
    updateQueryStreamName,
    updateQueryStreamEsql,
    saveQueryStream,
  } = useStreamRoutingEvents();
  const queryStreamForm = useQueryStreamForm();
  const isSaving = useIsQueryModeSaving();

  // The FROM clause is hardcoded - query from parent's ES|QL view
  const parentViewName = getEsqlViewName(parentStreamName);
  const fromClause = `FROM ${parentViewName}`;

  // Build the full query for display in the editor
  const fullQuery = useMemo(() => {
    if (!queryStreamForm) return { esql: fromClause };
    // Remove FROM clause with view name (which may contain dots)
    const userPart = queryStreamForm.esqlQuery.replace(/^FROM\s+[^\s]+(\s*\n)?/i, '');
    return { esql: userPart ? `${fromClause}\n${userPart}` : fromClause };
  }, [queryStreamForm, fromClause]);

  // Handle query changes - extract user-editable part
  const handleQueryChange = useCallback(
    (newQuery: AggregateQuery) => {
      if ('esql' in newQuery) {
        // Always ensure the FROM clause is preserved - remove it and any newline after
        const queryWithoutFrom = newQuery.esql.replace(/^FROM\s+[^\s]+(\s*\n)?/i, '');
        const fullEsql = queryWithoutFrom ? `${fromClause}\n${queryWithoutFrom}` : fromClause;
        updateQueryStreamEsql(fullEsql);
      }
    },
    [fromClause, updateQueryStreamEsql]
  );

  const handleQuerySubmit = useCallback(
    (newQuery: AggregateQuery | undefined) => {
      if (newQuery && 'esql' in newQuery) {
        handleQueryChange(newQuery);
      }
    },
    [handleQueryChange]
  );

  const handleNameChange = useCallback(
    (fullName: string) => {
      // Extract suffix from full name (remove parent prefix)
      const suffix = fullName.replace(`${parentStreamName}.`, '');
      updateQueryStreamName(suffix);
    },
    [parentStreamName, updateQueryStreamName]
  );

  const canSave = queryStreamForm?.name && queryStreamForm.name.trim() !== '';

  return (
    <NestedView last first={false}>
      <EuiPanel
        color="plain"
        hasShadow={false}
        hasBorder
        paddingSize="m"
        className={css`
          border-color: ${euiTheme.colors.primary};
        `}
      >
        <StreamNameFormRow
          prefix={`${parentStreamName}.`}
          partitionName={queryStreamForm?.name ?? ''}
          onChange={handleNameChange}
          readOnly={isSaving}
        />

        <EuiSpacer size="m" />

        <EuiFormRow
          label={i18n.translate('xpack.streams.queryStreamEntry.esqlQueryLabel', {
            defaultMessage: 'ES|QL Query',
          })}
          helpText={i18n.translate('xpack.streams.queryStreamEntry.esqlQueryHelpText', {
            defaultMessage: 'The FROM clause is fixed to query from the parent stream.',
          })}
          fullWidth
        >
          <ESQLLangEditor
            disableAutoFocus
            editorIsInline
            expandToFitQueryOnMount
            hasOutline
            hideRunQueryButton
            isLoading={isSaving}
            onTextLangQueryChange={handleQueryChange}
            onTextLangQuerySubmit={handleQuerySubmit}
            query={fullQuery}
          />
        </EuiFormRow>

        <EuiSpacer size="m" />

        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={cancelQueryStreamCreation} disabled={isSaving}>
              {i18n.translate('xpack.streams.queryStreamEntry.cancelButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={saveQueryStream}
              isLoading={isSaving}
              disabled={!canSave || isSaving}
            >
              {i18n.translate('xpack.streams.queryStreamEntry.createButton', {
                defaultMessage: 'Create query stream',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </NestedView>
  );
}

