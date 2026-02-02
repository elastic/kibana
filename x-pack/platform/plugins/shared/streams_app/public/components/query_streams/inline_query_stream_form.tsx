/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiPanel,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import type { AggregateQuery } from '@kbn/es-query';
import { getEsqlViewName } from '@kbn/streams-schema';
import { NestedView } from '../nested_view';
import { QueryStreamForm } from './query_stream_form';

/**
 * Props for the InlineQueryStreamForm component
 */
export interface InlineQueryStreamFormProps {
  /**
   * The parent stream name (used to generate child stream naming)
   */
  parentStreamName: string;
  /**
   * Initial name for the query stream (suffix only, without parent prefix)
   */
  initialName?: string;
  /**
   * Initial ES|QL query
   */
  initialEsqlQuery?: string;
  /**
   * Callback when save is clicked with the form data
   */
  onSave: (data: { name: string; esqlQuery: string }) => void | Promise<void>;
  /**
   * Callback when cancel is clicked
   */
  onCancel: () => void;
  /**
   * Callback when query changes (for live preview)
   */
  onQueryChange?: (esqlQuery: string) => void;
  /**
   * Whether the form is currently saving
   */
  isSaving?: boolean;
  /**
   * Whether the form fields should be read-only
   */
  readOnly?: boolean;
  /**
   * Whether this is the last item in a list (affects nested view styling)
   */
  isLast?: boolean;
  /**
   * Whether this is the first item in a list (affects nested view styling)
   */
  isFirst?: boolean;
}

/**
 * A reusable inline form component for creating or editing query streams.
 * This component manages its own form state and is not coupled to any specific
 * state management solution, making it reusable across different contexts.
 *
 * @example
 * ```tsx
 * <InlineQueryStreamForm
 *   parentStreamName="logs"
 *   onSave={async ({ name, esqlQuery }) => {
 *     await createQueryStream(name, esqlQuery);
 *   }}
 *   onCancel={() => setIsCreating(false)}
 *   isSaving={isLoading}
 * />
 * ```
 */
export function InlineQueryStreamForm({
  parentStreamName,
  initialName = '',
  initialEsqlQuery,
  onSave,
  onCancel,
  onQueryChange,
  isSaving = false,
  readOnly = false,
  isLast = true,
  isFirst = false,
}: InlineQueryStreamFormProps) {
  const { euiTheme } = useEuiTheme();

  // Form state
  const [name, setName] = useState(initialName);
  const [esqlQuery, setEsqlQuery] = useState(() => {
    if (initialEsqlQuery) {
      return initialEsqlQuery;
    }
    // Default: query from parent's ES|QL view
    const parentViewName = getEsqlViewName(parentStreamName);
    return `FROM ${parentViewName}`;
  });

  // Notify parent of query changes for live preview
  useEffect(() => {
    onQueryChange?.(esqlQuery);
  }, [esqlQuery, onQueryChange]);

  // Handle query changes - allow full query editing
  const handleQueryChange = useCallback((newQuery: AggregateQuery) => {
    if ('esql' in newQuery) {
      setEsqlQuery(newQuery.esql);
    }
  }, []);

  const handleQuerySubmit = useCallback(
    async (newQuery: AggregateQuery | undefined, _abortController?: AbortController) => {
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
      setName(suffix);
    },
    [parentStreamName]
  );

  const handleSave = useCallback(() => {
    onSave({ name, esqlQuery });
  }, [name, esqlQuery, onSave]);

  const canSave = name && name.trim() !== '';

  return (
    <NestedView last={isLast} first={isFirst}>
      <EuiPanel
        color="plain"
        hasShadow={false}
        hasBorder
        paddingSize="m"
        className={css`
          border-color: ${euiTheme.colors.primary};
        `}
      >
        <QueryStreamForm>
          <QueryStreamForm.StreamName
            partitionName={name}
            onChange={handleNameChange}
            prefix={`${parentStreamName}.`}
            readOnly={readOnly || isSaving}
          />
          <QueryStreamForm.ESQLEditor
            isLoading={isSaving}
            query={{ esql: esqlQuery }}
            onTextLangQueryChange={handleQueryChange}
            onTextLangQuerySubmit={handleQuerySubmit}
          />
        </QueryStreamForm>

        <EuiSpacer size="m" />

        <EuiFlexGroup justifyContent="flexEnd" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={onCancel} disabled={isSaving || readOnly}>
              {i18n.translate('xpack.streams.inlineQueryStreamForm.cancelButton', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              onClick={handleSave}
              isLoading={isSaving}
              disabled={!canSave || isSaving || readOnly}
            >
              {i18n.translate('xpack.streams.inlineQueryStreamForm.createButton', {
                defaultMessage: 'Create query stream',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </NestedView>
  );
}
