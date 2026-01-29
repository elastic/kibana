/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiFormRow,
  EuiPanel,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import type { AggregateQuery } from '@kbn/es-query';
import { ESQLLangEditor } from '@kbn/esql/public';
import { getEsqlViewName } from '@kbn/streams-schema';
import { StreamNameFormRow } from '../stream_name_form_row';
import { NestedView } from '../nested_view';

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

  // The FROM clause is hardcoded - query from parent's ES|QL view
  const parentViewName = getEsqlViewName(parentStreamName);
  const fromClause = `FROM ${parentViewName}`;

  // Build the full query for display in the editor
  const fullQuery = useMemo(() => {
    // Remove FROM clause with view name (which may contain dots)
    const userPart = esqlQuery.replace(/^FROM\s+[^\s]+(\s*\n)?/i, '');
    return { esql: userPart ? `${fromClause}\n${userPart}` : fromClause };
  }, [esqlQuery, fromClause]);

  // Handle query changes - extract user-editable part
  const handleQueryChange = useCallback(
    (newQuery: AggregateQuery) => {
      if ('esql' in newQuery) {
        // Always ensure the FROM clause is preserved - remove it and any newline after
        const queryWithoutFrom = newQuery.esql.replace(/^FROM\s+[^\s]+(\s*\n)?/i, '');
        const fullEsql = queryWithoutFrom ? `${fromClause}\n${queryWithoutFrom}` : fromClause;
        setEsqlQuery(fullEsql);
      }
    },
    [fromClause]
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
        <StreamNameFormRow
          prefix={`${parentStreamName}.`}
          partitionName={name}
          onChange={handleNameChange}
          readOnly={readOnly || isSaving}
        />

        <EuiSpacer size="m" />

        <EuiFormRow
          label={i18n.translate('xpack.streams.inlineQueryStreamForm.esqlQueryLabel', {
            defaultMessage: 'ES|QL Query',
          })}
          helpText={i18n.translate('xpack.streams.inlineQueryStreamForm.esqlQueryHelpText', {
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
