/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFormRow, EuiIconTip, EuiPanel, EuiText } from '@elastic/eui';
import { Controller, useFormContext } from 'react-hook-form';
import { CodeEditor, ESQL_LANG_ID } from '@kbn/code-editor';
import { suggest, validateQuery } from '@kbn/esql-language';
import { getEsqlColumns } from '@kbn/esql-utils';
import { monaco } from '@kbn/monaco';
import type { ESQLCallbacks } from '@kbn/esql-types';
import { useDebounceFn } from '@kbn/react-hooks';
import type { FormValues } from '../types';
import { useRuleFormServices } from '../contexts';

// Visible prefix in the editor (non-deletable) - includes pipe for ES|QL autocomplete context
const EDITOR_PREFIX = '| WHERE ';
// Stored prefix in form value (without pipe for cleaner data)
const STORED_PREFIX = 'WHERE ';

type WhereClauseFieldPath = 'evaluation.query.condition' | 'recoveryPolicy.query.condition';

export interface WhereClauseEditorProps {
  name: WhereClauseFieldPath;
  label?: React.ReactNode;
  /** Optional tooltip content displayed next to the label */
  labelTooltip?: string;
  helpText?: React.ReactNode;
  fullWidth?: boolean;
  dataTestSubj?: string;
  disabled?: boolean;
  /** Base query for autocomplete and validation context */
  baseQuery: string;
  /** Whether to show the "Optional" label append. Defaults to true. */
  isOptional?: boolean;
  rules?: {
    required?: string;
    validate?: (value: string | undefined) => string | boolean | Promise<string | boolean>;
  };
}

interface EditorFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: React.ReactNode;
  labelTooltip?: string;
  helpText?: React.ReactNode;
  error?: { message?: string };
  fullWidth?: boolean;
  disabled?: boolean;
  isOptional?: boolean;
  dataTestSubj?: string;
  suggestionProvider?: monaco.languages.CompletionItemProvider;
  baseQuery: string;
  queryCallbacks?: ESQLCallbacks;
}

const EditorField: React.FC<EditorFieldProps> = ({
  value,
  onChange,
  label,
  labelTooltip,
  helpText,
  error,
  fullWidth,
  disabled,
  isOptional = true,
  dataTestSubj,
  suggestionProvider,
  baseQuery,
  queryCallbacks,
}) => {
  // Build the label element with optional tooltip
  const labelElement = label ? (
    labelTooltip ? (
      <>
        {label}
        &nbsp;
        <EuiIconTip position="right" type="question" content={labelTooltip} />
      </>
    ) : (
      label
    )
  ) : undefined;
  // Convert stored value (WHERE x) to display value (| WHERE x)
  // Handle legacy values that might not have the prefix
  const getDisplayValue = useCallback((storedValue: string): string => {
    if (storedValue.startsWith(EDITOR_PREFIX)) {
      return storedValue; // Already has editor prefix
    }
    if (storedValue.startsWith(STORED_PREFIX)) {
      return '| ' + storedValue; // Add pipe to stored prefix
    }
    return EDITOR_PREFIX + storedValue; // Add full editor prefix
  }, []);

  const displayValue = getDisplayValue(value);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const completionProviderDisposableRef = useRef<monaco.IDisposable | null>(null);
  // Flag to prevent re-entrant handleChange calls during prefix restoration
  const isRestoringRef = useRef(false);

  // Handle changes: convert editor value back to stored format.
  // This is the SOLE protection mechanism for the "| WHERE " prefix.
  // When the prefix is damaged (via Select All + Delete, Cut, drag-and-drop, etc.),
  // we directly restore the Monaco model content rather than relying on React
  // re-renders (which fail silently when the form value doesn't change).
  const handleChange = useCallback(
    (newValue: string) => {
      // Skip re-entrant calls triggered by our own model restoration below
      if (isRestoringRef.current) {
        isRestoringRef.current = false;
        return;
      }

      if (newValue.startsWith(EDITOR_PREFIX)) {
        // Normal edit - prefix is intact. Extract the condition for storage.
        const storedValue = newValue.slice(2); // Remove "| "
        const condition = storedValue.replace(STORED_PREFIX, '').trim();
        if (!condition) {
          onChange('');
        } else {
          onChange(storedValue);
        }
      } else {
        // The prefix was damaged (e.g., Select All + Delete, Cut, paste-over).
        // Directly restore the Monaco model to the last known good state.
        // We cannot rely on onChange(value) because if the value hasn't changed,
        // React won't re-render and Monaco stays in the broken state.
        const editor = editorRef.current;
        if (editor) {
          const model = editor.getModel();
          if (model) {
            const correctValue = getDisplayValue(value);
            isRestoringRef.current = true;
            model.setValue(correctValue);
            // Place cursor at the end of the prefix (start of editable area)
            const prefixEnd = model.getPositionAt(EDITOR_PREFIX.length);
            editor.setPosition(prefixEnd);
          }
        }
      }
    },
    [onChange, value, getDisplayValue]
  );

  // Validate the query and show error markers
  const handleValidation = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const model = editor.getModel();
    if (!model) {
      return;
    }

    const editorText = model.getValue();

    // Check if the WHERE clause is effectively empty (only contains "| WHERE " with optional whitespace)
    const whereCondition = editorText.replace(EDITOR_PREFIX, '').trim();
    if (!whereCondition) {
      monaco.editor.setModelMarkers(model, 'esql-where-clause', []);
      return;
    }

    // baseQuery is required - skip validation if not available (shouldn't happen)
    if (!baseQuery) {
      monaco.editor.setModelMarkers(model, 'esql-where-clause', []);
      return;
    }

    // Use the same fake query construction as autocomplete
    const fullQuery = baseQuery + ' ' + editorText;
    const prefixLength = baseQuery.length + 1; // +1 for the space

    try {
      // Pass queryCallbacks for semantic validation (field name checking)
      const { errors, warnings } = await validateQuery(fullQuery, queryCallbacks);

      // Convert errors to Monaco markers, adjusting positions for the editor content
      const markers: monaco.editor.IMarkerData[] = [...errors, ...warnings]
        .map((msg) => {
          // Check if this is an ESQLMessage (has location) or EditorError (has line/column)
          if ('location' in msg && msg.location) {
            // ESQLMessage - need to convert offset to position
            const location = msg.location;
            // Only show errors/warnings that are in the WHERE clause portion
            if (location.min < prefixLength) {
              return null;
            }

            const adjustedMin = location.min - prefixLength;
            const adjustedMax = (location.max || location.min) - prefixLength;

            // Convert offset to line/column
            const startPos = model.getPositionAt(Math.max(0, adjustedMin));
            const endPos = model.getPositionAt(Math.max(0, adjustedMax + 1));

            return {
              message: msg.text,
              severity:
                msg.type === 'error' ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
              startLineNumber: startPos.lineNumber,
              startColumn: startPos.column,
              endLineNumber: endPos.lineNumber,
              endColumn: endPos.column,
            };
          } else if ('startLineNumber' in msg) {
            // EditorError - already has line/column positions relative to the fake query
            // For single-line fake queries, adjust the column positions
            // The fake query is: "contextPrefix editorText" (all on line 1)
            // prefixLength includes the space, so columns need adjustment
            const adjustedStartColumn = msg.startColumn - prefixLength;
            const adjustedEndColumn = msg.endColumn - prefixLength;

            // Skip if the error is entirely in the prefix portion
            if (adjustedEndColumn <= 0) {
              return null;
            }

            const severity =
              typeof msg.severity === 'number'
                ? msg.severity
                : msg.severity === 'error'
                ? monaco.MarkerSeverity.Error
                : monaco.MarkerSeverity.Warning;

            return {
              message: msg.message,
              severity,
              startLineNumber: msg.startLineNumber,
              startColumn: Math.max(1, adjustedStartColumn),
              endLineNumber: msg.endLineNumber,
              endColumn: Math.max(1, adjustedEndColumn),
            };
          }
          return null;
        })
        .filter((marker): marker is monaco.editor.IMarkerData => marker !== null);

      monaco.editor.setModelMarkers(model, 'esql-where-clause', markers);
    } catch (err) {
      // Clear markers on error
      monaco.editor.setModelMarkers(model, 'esql-where-clause', []);
    }
  }, [baseQuery, queryCallbacks]);

  // Debounced validation trigger - auto-cancels on unmount
  const { run: triggerValidation } = useDebounceFn(handleValidation, { wait: 300 });

  // Set up editor: register suggestion provider
  const handleEditorDidMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      editorRef.current = editor;

      // Register our custom suggestion provider directly with Monaco
      if (suggestionProvider) {
        completionProviderDisposableRef.current = monaco.languages.registerCompletionItemProvider(
          ESQL_LANG_ID,
          suggestionProvider
        );
      }

      // Run initial validation
      triggerValidation();
    },
    [triggerValidation, suggestionProvider]
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      completionProviderDisposableRef.current?.dispose();
    };
  }, []);

  // Re-run validation when value changes
  useEffect(() => {
    if (editorRef.current) {
      triggerValidation();
    }
  }, [value, triggerValidation]);

  return (
    <EuiFormRow
      label={labelElement}
      labelAppend={
        isOptional ? (
          <EuiText size="xs" color="subdued">
            {i18n.translate('xpack.alertingV2.ruleForm.conditionOptional', {
              defaultMessage: 'Optional',
            })}
          </EuiText>
        ) : undefined
      }
      helpText={helpText}
      isInvalid={!!error}
      error={error?.message}
      fullWidth={fullWidth}
    >
      <EuiPanel paddingSize="none" hasShadow={false} hasBorder css={{ overflow: 'hidden' }}>
        <div data-test-subj={dataTestSubj}>
          <CodeEditor
            languageId={ESQL_LANG_ID}
            value={displayValue}
            onChange={handleChange}
            height="44px"
            suggestionProvider={suggestionProvider}
            editorDidMount={handleEditorDidMount}
            options={{
              minimap: { enabled: false },
              lineNumbers: 'on',
              folding: false,
              wordWrap: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              fontSize: 14,
              quickSuggestions: true,
              suggestOnTriggerCharacters: true,
              readOnly: disabled,
            }}
          />
        </div>
      </EuiPanel>
    </EuiFormRow>
  );
};

/**
 * A WHERE clause editor component that provides a streamlined input for
 * ES|QL WHERE conditions with autocomplete support.
 *
 * Features:
 * - Visual "WHERE " prefix that cannot be deleted
 * - ES|QL autocomplete based on the base query
 * - Single-line design optimized for condition expressions
 *
 * The form stores the full WHERE clause including the prefix (e.g., "WHERE count > 100").
 * The editor ensures the WHERE prefix is always present and protected from deletion.
 * Protection works by intercepting all content changes in handleChange rather than
 * guarding individual keyboard events, so it catches Select All + Delete, Cut,
 * paste-over, drag-and-drop, and all other edit methods.
 *
 * @example
 * ```tsx
 * <WhereClauseEditor
 *   name="evaluation.query.condition"
 *   label="Trigger condition"
 *   baseQuery="FROM logs-* | STATS count() BY host"
 *   helpText="Define when to trigger an alert (e.g., count > 100)"
 * />
 * // Form value will be: "WHERE count > 100"
 * ```
 */
export const WhereClauseEditor: React.FC<WhereClauseEditorProps> = ({
  name,
  label,
  labelTooltip,
  helpText,
  fullWidth = true,
  dataTestSubj = 'whereClauseEditor',
  disabled = false,
  isOptional = true,
  baseQuery = '',
  rules,
}) => {
  const { control } = useFormContext<FormValues>();
  const { data } = useRuleFormServices();
  const search = data.search.search;

  // Create ES|QL callbacks internally using the search service
  const queryCallbacks = useMemo(() => {
    return {
      getColumnsFor: async ({ query }: { query?: string } | undefined = {}) => {
        return getEsqlColumns({ esqlQuery: query, search });
      },
    };
  }, [search]);

  // Custom suggestion provider that wraps ES|QL autocomplete
  const suggestionProvider: monaco.languages.CompletionItemProvider | undefined = useMemo(() => {
    // Without callbacks, we can't provide meaningful suggestions
    if (!queryCallbacks) {
      return undefined;
    }

    return {
      triggerCharacters: [' ', '.', '(', ','],
      async provideCompletionItems(
        model: monaco.editor.ITextModel,
        position: monaco.Position
      ): Promise<monaco.languages.CompletionList> {
        // baseQuery is required for autocomplete
        if (!baseQuery) {
          return { suggestions: [] };
        }

        const editorText = model.getValue();

        // Editor text already contains "| WHERE <condition>"
        // Prepend the base query to form the full query
        const fullQuery = baseQuery + ' ' + editorText;

        // Calculate offset: add the base query length to the editor position
        const offsetInModel = model.getOffsetAt(position);
        const offsetInFakeQuery = baseQuery.length + 1 + offsetInModel; // +1 for the space

        try {
          const suggestions = await suggest(fullQuery, offsetInFakeQuery, queryCallbacks);

          // Convert to Monaco suggestions
          const wordInfo = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: wordInfo.startColumn,
            endColumn: wordInfo.endColumn,
          };

          const monacoSuggestions = suggestions.map((s) => ({
            label: s.label,
            // Use text property for what gets inserted
            insertText: s.text,
            filterText: s.filterText,
            // Convert string kind (e.g., 'Field') to Monaco enum
            kind:
              s.kind in monaco.languages.CompletionItemKind
                ? monaco.languages.CompletionItemKind[
                    s.kind as keyof typeof monaco.languages.CompletionItemKind
                  ]
                : monaco.languages.CompletionItemKind.Field,
            detail: s.detail,
            documentation: s.documentation,
            range,
            sortText: s.sortText,
            // Handle snippet insertions (e.g., function calls with cursor positioning)
            insertTextRules: s.asSnippet
              ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
              : undefined,
          }));

          return { suggestions: monacoSuggestions };
        } catch (err) {
          return { suggestions: [] };
        }
      },
    };
  }, [baseQuery, queryCallbacks]);

  // Validation function for form-level error reporting
  const validateWhereClause = useCallback(
    async (formValue: string | undefined): Promise<string | boolean> => {
      // Empty value is valid (optional field)
      if (!formValue) {
        return true;
      }

      // Extract the condition from the stored value
      const condition = formValue.replace(STORED_PREFIX, '').trim();
      if (!condition) {
        return true; // Empty condition is valid
      }

      // Need baseQuery for validation
      if (!baseQuery) {
        return true; // Can't validate without context
      }

      // Construct full query for validation
      const editorValue = EDITOR_PREFIX + condition;
      const fullQuery = baseQuery + ' ' + editorValue;

      try {
        const { errors } = await validateQuery(fullQuery, queryCallbacks);

        // Filter errors to only those in the WHERE clause portion
        const prefixLength = baseQuery.length + 1; // +1 for space
        const whereClauseErrors = errors.filter((err) => {
          if ('location' in err && err.location) {
            return err.location.min >= prefixLength;
          }
          if ('startColumn' in err) {
            return err.startColumn > prefixLength;
          }
          return false;
        });

        if (whereClauseErrors.length > 0) {
          // Return the first error message
          const firstError = whereClauseErrors[0];
          const message = 'text' in firstError ? firstError.text : firstError.message;
          return `Invalid WHERE clause: ${message}`;
        }

        return true;
      } catch (err) {
        // If validation fails unexpectedly, don't block the form
        return true;
      }
    },
    [baseQuery, queryCallbacks]
  );

  // Merge custom rules with our validation
  const mergedRules = useMemo(() => {
    const validate = rules?.validate;

    return {
      ...rules,
      validate: async (formValue: string | undefined) => {
        const esqlResult = await validateWhereClause(formValue);
        if (esqlResult !== true) {
          return esqlResult;
        }

        // Run custom validation if provided
        if (validate) {
          return validate(formValue);
        }

        return true;
      },
    };
  }, [rules, validateWhereClause]);

  return (
    <Controller
      name={name}
      control={control}
      rules={mergedRules}
      render={({ field: { value, onChange }, fieldState: { error } }) => {
        return (
          <EditorField
            value={(value as string) || ''}
            onChange={onChange}
            label={label}
            labelTooltip={labelTooltip}
            helpText={helpText}
            error={error}
            fullWidth={fullWidth}
            disabled={disabled}
            isOptional={isOptional}
            dataTestSubj={dataTestSubj}
            suggestionProvider={suggestionProvider}
            baseQuery={baseQuery}
            queryCallbacks={queryCallbacks}
          />
        );
      }}
    />
  );
};
