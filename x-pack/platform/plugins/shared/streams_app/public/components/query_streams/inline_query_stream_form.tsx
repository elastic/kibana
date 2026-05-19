/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
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
import useMount from 'react-use/lib/useMount';
import { useChildStreamInput } from '../stream_name_form_row';
import { useStreamsRoutingSelector } from '../stream_management/data_management/stream_detail_routing/state_management/stream_routing_state_machine';
import { QueryStreamForm } from './query_stream_form';

/**
 * Props for the InlineQueryStreamForm component
 */
export interface InlineQueryStreamFormProps {
  /**
   * Initial name for the query stream (suffix only, without parent prefix)
   */
  initialName?: string;
  /**
   * Initial ES|QL query
   */
  initialEsqlQuery?: string;
  /**
   * Callback when save is clicked. `name` is the partition suffix only (no parent prefix).
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
   * Whether the stream name field should be read-only (independent of `readOnly`)
   */
  nameReadOnly?: boolean;
  /**
   * Custom label for the save button (defaults to "Create query stream")
   */
  saveButtonLabel?: string;
  /**
   * Callback when delete is clicked. The delete button is only shown when this is provided.
   */
  onDelete?: () => void;
  /**
   * Full names of existing query-stream siblings — required for the duplicate-name check
   * because query siblings are not present in the wired routing array.
   */
  existingSiblingNames?: readonly string[];
}

/**
 * Inline form for creating or editing a query stream. Must be rendered within a
 * `StreamRoutingContext` subtree — it reads the parent stream name from that context.
 *
 * @example
 * ```tsx
 * <InlineQueryStreamForm
 *   onSave={async ({ name, esqlQuery }) => {
 *     await createQueryStream(name, esqlQuery);
 *   }}
 *   onCancel={() => setIsCreating(false)}
 *   isSaving={isLoading}
 * />
 * ```
 */
export function InlineQueryStreamForm({
  initialName = '',
  initialEsqlQuery,
  onSave,
  onCancel,
  onQueryChange,
  isSaving = false,
  readOnly = false,
  saveButtonLabel,
  onDelete,
  nameReadOnly = false,
  existingSiblingNames,
}: InlineQueryStreamFormProps) {
  const { euiTheme } = useEuiTheme();
  const parentStreamName = useStreamsRoutingSelector(
    (snapshot) => snapshot.context.definition.stream.name
  );
  const prefix = `${parentStreamName}.`;
  // Form state
  const [name, setName] = useState(initialName);
  const [esqlQuery, setEsqlQuery] = useState(
    () => initialEsqlQuery ?? `FROM ${getEsqlViewName(parentStreamName)}`
  );

  const fullName = `${prefix}${name}`;
  const { isStreamNameValid, errorMessage, helpText, setLocalStreamName } = useChildStreamInput({
    streamName: fullName,
    readOnly: nameReadOnly || readOnly || isSaving,
    checkRootChildExists: false,
    additionalExistingNames: existingSiblingNames,
  });

  const shouldShowNameValidation = !nameReadOnly;
  const displayedIsStreamNameValid = shouldShowNameValidation ? isStreamNameValid : true;
  const displayedErrorMessage = shouldShowNameValidation ? errorMessage : undefined;

  useMount(() => {
    if (onQueryChange) onQueryChange(esqlQuery);
  });

  const handleNameChange = useCallback(
    (newFullName: string) => {
      const suffix = newFullName.replace(prefix, '');
      setName(suffix);
    },
    [prefix]
  );

  // Handle query changes - allow full query editing
  const handleQueryChange = useCallback(
    (newQuery: AggregateQuery) => {
      if ('esql' in newQuery) {
        setEsqlQuery(newQuery.esql);
        if (onQueryChange) onQueryChange(newQuery.esql);
      }
    },
    [onQueryChange]
  );

  const handleQuerySubmit = useCallback(
    async (newQuery: AggregateQuery | undefined, _abortController?: AbortController) => {
      if (newQuery && 'esql' in newQuery) {
        handleQueryChange(newQuery);
      }
    },
    [handleQueryChange]
  );

  const handleSave = () => onSave({ name, esqlQuery });

  const canSave =
    (nameReadOnly || isStreamNameValid) &&
    name &&
    name.trim() !== '' &&
    esqlQuery &&
    esqlQuery.trim() !== '';

  return (
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
          setLocalStreamName={setLocalStreamName}
          prefix={prefix}
          readOnly={nameReadOnly || readOnly || isSaving}
          isStreamNameValid={displayedIsStreamNameValid}
          errorMessage={displayedErrorMessage}
          helpText={helpText}
        />
        <QueryStreamForm.ESQLEditor
          isLoading={isSaving}
          query={{ esql: esqlQuery }}
          onTextLangQueryChange={handleQueryChange}
          onTextLangQuerySubmit={handleQuerySubmit}
        />
      </QueryStreamForm>

      <EuiSpacer size="m" />

      <EuiFlexGroup justifyContent="spaceBetween" gutterSize="s">
        <EuiFlexItem grow={false}>
          {onDelete && (
            <EuiButton
              color="danger"
              size="s"
              onClick={onDelete}
              disabled={isSaving || readOnly}
              data-test-subj="streamsAppQueryStreamFormDeleteButton"
            >
              {i18n.translate('xpack.streams.inlineQueryStreamForm.deleteButton', {
                defaultMessage: 'Remove',
              })}
            </EuiButton>
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s">
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
                data-test-subj="streamsAppQueryStreamFormSaveButton"
              >
                {saveButtonLabel ??
                  i18n.translate('xpack.streams.inlineQueryStreamForm.createButton', {
                    defaultMessage: 'Create query stream',
                  })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
