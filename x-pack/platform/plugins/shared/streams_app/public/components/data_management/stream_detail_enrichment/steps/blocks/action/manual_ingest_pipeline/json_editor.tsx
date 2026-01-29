/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useController } from 'react-hook-form';
import { EuiFormRow, EuiLink } from '@elastic/eui';
import { CodeEditor } from '@kbn/code-editor';
import { monaco } from '@kbn/monaco';
import { i18n } from '@kbn/i18n';
import { useAbortController } from '@kbn/react-hooks';
import type { JsonValue } from '@kbn/utility-types';
import type { ElasticsearchProcessorType } from '@kbn/streams-schema';
import { elasticsearchProcessorTypes } from '@kbn/streams-schema';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ProcessorSuggestionsResponse } from '@kbn/streams-plugin/common';
import { useKibana } from '../../../../../../../hooks/use_kibana';
import type { ProcessorFormState } from '../../../../types';
import {
  serializeXJson,
  parseXJsonOrString,
  buildProcessorInsertText,
  buildPropertyInsertText,
  hasOddQuoteCount,
  shouldSuggestProcessorKey,
  fetchProcessorSuggestions,
  detectProcessorContext,
} from '../../../../helpers';

export const JsonEditor = () => {
  const { signal } = useAbortController();
  const {
    core: { docLinks },
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();
  const { field, fieldState } = useController<ProcessorFormState, 'processors'>({
    name: 'processors',
    rules: {
      validate: (value) => {
        const parsedValue = typeof value === 'string' ? parseXJsonOrString(value) : value;

        if (typeof value === 'string' && typeof parsedValue === 'string') {
          return i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.ingestPipelineProcessorsInvalidJSON',
            { defaultMessage: 'Invalid JSON format' }
          );
        }

        if (!Array.isArray(parsedValue)) {
          return i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.ingestPipelineProcessorsInvalidArray',
            { defaultMessage: 'Expected an array' }
          );
        }

        const invalidProcessor = parsedValue.find((processor: Record<string, unknown>) => {
          const processorType = Object.keys(processor)[0];
          return (
            processorType &&
            !elasticsearchProcessorTypes.includes(processorType as ElasticsearchProcessorType)
          );
        });

        if (invalidProcessor) {
          return i18n.translate(
            'xpack.streams.streamDetailView.managementTab.enrichment.processor.ingestPipelineProcessorsInvalidProcessorType',
            {
              defaultMessage: 'Invalid processor type: {processorType}',
              values: { processorType: Object.keys(invalidProcessor)[0] },
            }
          );
        }

        return undefined;
      },
    },
  });

  /**
   * To have the editor properly handle the set xjson language
   * we need to avoid the continuous parsing/serialization of the editor value
   * using a parallel state always setting a string make the editor format well the content.
   */
  const [value, setValue] = React.useState(() => serializeXJson(field.value, '[]'));

  const handleChange = (newValue: string) => {
    setValue(newValue);
    field.onChange(parseXJsonOrString(newValue));
  };

  const fetchRef = React.useRef<Promise<ProcessorSuggestionsResponse> | null>(null);

  const loadProcessorSuggestions =
    React.useCallback(async (): Promise<ProcessorSuggestionsResponse> => {
      if (!fetchRef.current) {
        fetchRef.current = fetchProcessorSuggestions(streamsRepositoryClient, signal);
      }
      const res = await fetchRef.current;
      if (!res || res.processors.length === 0) {
        fetchRef.current = null;
      }
      return res;
    }, [streamsRepositoryClient, signal]);

  const suggestionProvider = React.useMemo<monaco.languages.CompletionItemProvider>(() => {
    const isProcessorTypeKeyContext = (
      model: monaco.editor.ITextModel,
      position: monaco.Position
    ) => {
      const lineBefore = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });
      const nearbyContext = model.getValueInRange({
        startLineNumber: Math.max(1, position.lineNumber - 12),
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });
      return shouldSuggestProcessorKey(lineBefore, nearbyContext);
    };

    return {
      triggerCharacters: ['"'],
      provideCompletionItems: async (
        model: monaco.editor.ITextModel,
        position: monaco.Position
      ): Promise<monaco.languages.CompletionList> => {
        const response = await loadProcessorSuggestions().catch(
          (): ProcessorSuggestionsResponse => ({
            processors: [],
            propertiesByProcessor: {},
          })
        );

        const lineContentAfter = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: model.getLineMaxColumn(position.lineNumber),
        });
        const wordUntil = model.getWordUntilPosition(position);
        const range: monaco.IRange = {
          startLineNumber: position.lineNumber,
          startColumn: wordUntil.startColumn,
          endLineNumber: position.lineNumber,
          endColumn: lineContentAfter.startsWith('"') ? position.column + 1 : position.column,
        };

        const linePrefix = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });
        const alreadyOpenedQuote = hasOddQuoteCount(linePrefix);

        const ctx = detectProcessorContext(
          model,
          position,
          (response.processors || []).map((p) => p.name)
        );

        if (ctx.kind === 'processorProperty' && ctx.processorName) {
          const props = response.propertiesByProcessor[ctx.processorName] || [];
          const suggestions: monaco.languages.CompletionItem[] = props.map(
            (propertySuggestion: { name: string; template?: JsonValue | undefined }) => {
              const label = String(propertySuggestion.name);
              const insertText = buildPropertyInsertText(
                label,
                propertySuggestion.template,
                alreadyOpenedQuote
              );
              return {
                label,
                kind: monaco.languages.CompletionItemKind.Property,
                detail: 'Property',
                insertText,
                range,
                sortText: label,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              };
            }
          );
          return { suggestions };
        }

        if (!isProcessorTypeKeyContext(model, position)) {
          return { suggestions: [] };
        }
        const suggestions: monaco.languages.CompletionItem[] = (response.processors || []).map(
          (processorSuggestion: { name: string; template?: JsonValue | undefined }) => {
            const label = String(processorSuggestion.name);
            const insertText = buildProcessorInsertText(
              label,
              processorSuggestion.template,
              alreadyOpenedQuote
            );
            return {
              label,
              kind: monaco.languages.CompletionItemKind.Property,
              detail: 'Processor',
              insertText,
              range,
              sortText: label,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            };
          }
        );
        return { suggestions };
      },
    };
  }, [loadProcessorSuggestions]);

  React.useEffect(() => {
    const disposable = monaco.languages.registerCompletionItemProvider('xjson', suggestionProvider);
    return () => disposable.dispose();
  }, [suggestionProvider]);

  const editorOptions = React.useMemo<monaco.editor.IStandaloneEditorConstructionOptions>(
    () => ({
      automaticLayout: true,
      wordWrap: 'on',
      quickSuggestions: { strings: false, other: true, comments: false },
      suggestOnTriggerCharacters: true,
    }),
    []
  );

  return (
    <EuiFormRow
      label={i18n.translate(
        'xpack.streams.streamDetailView.managementTab.enrichment.processor.ingestPipelineProcessorsLabel',
        { defaultMessage: 'Ingest pipeline processors' }
      )}
      helpText={
        <FormattedMessage
          id="xpack.streams.streamDetailView.managementTab.enrichment.processor.ingestPipelineProcessorsHelpText"
          defaultMessage={
            'A JSON-encoded array of {ingestPipelineProcessors}. {conditions} defined in the processor JSON take precedence over conditions defined in "Optional fields".'
          }
          values={{
            ingestPipelineProcessors: (
              <EuiLink href={docLinks.links.ingest.processors} target="_blank" external>
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.processor.ingestPipelineProcessorsLabel',
                  { defaultMessage: 'ingest pipeline processors' }
                )}
              </EuiLink>
            ),
            conditions: (
              <EuiLink href={docLinks.links.ingest.conditionalProcessor} target="_blank" external>
                {i18n.translate(
                  'xpack.streams.streamDetailView.managementTab.enrichment.processor.ingestPipelineProcessorsConditionallyLabel',
                  { defaultMessage: 'Conditions' }
                )}
              </EuiLink>
            ),
          }}
        />
      }
      error={fieldState.error?.message}
      isInvalid={fieldState.invalid}
      fullWidth
    >
      <CodeEditor
        dataTestSubj="streamsManualPipelineJsonEditor"
        value={value}
        onChange={handleChange}
        languageId="xjson"
        height={200}
        aria-label={i18n.translate(
          'xpack.streams.streamDetailView.managementTab.enrichment.processor.ingestPipelineProcessorsAriaLabel',
          { defaultMessage: 'Ingest pipeline processors editor' }
        )}
        options={editorOptions}
      />
    </EuiFormRow>
  );
};
