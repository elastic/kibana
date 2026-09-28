/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { monaco } from '@kbn/code-editor';
import type { RuleFormServices } from '../../form/contexts/rule_form_context';
import { useEsqlCallbacks } from '../../form/hooks/use_esql_callbacks';
import { useSplitQueryCompletion } from './use_split_query_completion';
import { useSplitQueryValidation } from './use_split_query_validation';

type EditorMountHandler = (editor: monaco.editor.IStandaloneCodeEditor) => void;

interface UseSandboxEditorMountsParams {
  /** Base query that precedes the alert/recovery fragments (empty for standalone). */
  baseQuery: string;
  services: RuleFormServices;
}

interface SandboxEditorMounts {
  onAlertEditorMount: EditorMountHandler;
  onRecoveryEditorMount: EditorMountHandler;
  onBaseEditorMount: EditorMountHandler;
  onSingleEditorMount: EditorMountHandler;
}

/**
 * Builds the `editorDidMount` handlers for every ES|QL editor in the sandbox,
 * composing split-query completion and client-side validation per editor.
 */
export const useSandboxEditorMounts = ({
  baseQuery,
  services,
}: UseSandboxEditorMountsParams): SandboxEditorMounts => {
  const esqlCallbacks = useEsqlCallbacks({
    application: services.application,
    http: services.http,
    search: services.data.search.search,
  });

  const { onEditorMount: onAlertCompletionMount } = useSplitQueryCompletion({
    baseQuery,
    search: services.data.search.search,
  });
  const { onEditorMount: onRecoveryCompletionMount } = useSplitQueryCompletion({
    baseQuery,
    search: services.data.search.search,
  });
  const { onEditorMount: onAlertValidationMount } = useSplitQueryValidation({
    baseQuery,
    callbacks: esqlCallbacks,
  });
  const { onEditorMount: onRecoveryValidationMount } = useSplitQueryValidation({
    baseQuery,
    callbacks: esqlCallbacks,
  });

  // Base tab and single editor hold a complete query (no locked base prefix),
  // so validation runs verbatim with an empty base.
  const { onEditorMount: onBaseEditorMount } = useSplitQueryValidation({
    baseQuery: '',
    callbacks: esqlCallbacks,
  });
  const { onEditorMount: onSingleEditorMount } = useSplitQueryValidation({
    baseQuery: '',
    callbacks: esqlCallbacks,
  });

  const onAlertEditorMount = useCallback<EditorMountHandler>(
    (editor) => {
      onAlertCompletionMount(editor);
      onAlertValidationMount(editor);
    },
    [onAlertCompletionMount, onAlertValidationMount]
  );
  const onRecoveryEditorMount = useCallback<EditorMountHandler>(
    (editor) => {
      onRecoveryCompletionMount(editor);
      onRecoveryValidationMount(editor);
    },
    [onRecoveryCompletionMount, onRecoveryValidationMount]
  );

  return { onAlertEditorMount, onRecoveryEditorMount, onBaseEditorMount, onSingleEditorMount };
};
