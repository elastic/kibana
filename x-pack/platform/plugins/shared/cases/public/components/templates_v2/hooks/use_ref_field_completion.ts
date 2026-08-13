/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { monaco } from '@kbn/monaco';
import type { FieldDefinition } from '../../../../common/types/domain/field_definition/v1';
import { useGetFieldDefinitions } from '../../field_library/hooks/use_get_field_definitions';
import { buildRefFieldSuggestions, getRefCompletionContext } from '../utils/ref_field_completion';

/**
 * Adds `$ref` autocomplete to the template YAML editor, sourced from the owner's field library.
 * The editor otherwise has no completion for library references — authors must remember exact field
 * names or open the docs — so typing `$ref:` now offers the available field definitions inline.
 *
 * A single completion provider is registered for the `yaml` language and disposed on unmount. It is
 * scoped to this editor's model (URI guard) so it never contributes suggestions to other YAML
 * editors on the page. The provider reads the field list from a ref that a separate effect keeps
 * in sync with the query, so provider registration does not churn as data loads.
 */
export const useRefFieldCompletion = (
  editor: monaco.editor.IStandaloneCodeEditor | null,
  owner: string | undefined
) => {
  const { data } = useGetFieldDefinitions({ owner, staleTime: Infinity });
  const fieldDefinitionsRef = useRef<FieldDefinition[]>([]);

  useEffect(() => {
    fieldDefinitionsRef.current = data?.fieldDefinitions ?? [];
  }, [data]);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const model = editor.getModel();
    if (!model) {
      return;
    }

    const editorModelUri = model.uri.toString();

    const provider = monaco.languages.registerCompletionItemProvider('yaml', {
      triggerCharacters: [':', ' '],
      provideCompletionItems: (targetModel, position) => {
        if (targetModel.uri.toString() !== editorModelUri) {
          return { suggestions: [] };
        }

        const textBeforeCursor = targetModel.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const context = getRefCompletionContext(textBeforeCursor, position.column);
        if (!context) {
          return { suggestions: [] };
        }

        const range = new monaco.Range(
          position.lineNumber,
          context.replaceStartColumn,
          position.lineNumber,
          context.replaceEndColumn
        );

        const suggestions = buildRefFieldSuggestions(fieldDefinitionsRef.current).map(
          (suggestion) => ({
            label: suggestion.name,
            kind: monaco.languages.CompletionItemKind.Reference,
            insertText: suggestion.name,
            detail: suggestion.detail,
            documentation: suggestion.description,
            range,
          })
        );

        return { suggestions };
      },
    });

    return () => {
      provider.dispose();
    };
  }, [editor]);
};
