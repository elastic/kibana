/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESQL_LANG_ID, monaco } from '@kbn/monaco';
import { useEffect } from 'react';
import { OnechatEsqlParam } from '../types/esql_tool_form_types';

const SOURCE_NAME = 'esql-param-validator';
const COMMAND_ID = 'esql.addParam';

const PARAM_REGEX = /(?<!\S)\?\??(\w+)/g;

const highlightMissingParams = ({
  model,
  params,
}: {
  model: monaco.editor.ITextModel;
  params: OnechatEsqlParam[];
}) => {
  const definedParams = new Set(params.map((param) => param.name));
  const paramMatches = model.getValue().matchAll(PARAM_REGEX);
  const markers: monaco.editor.IMarkerData[] = [];

  for (const match of paramMatches) {
    const [matchStr, paramName] = match;
    if (match.index !== undefined && !definedParams.has(paramName)) {
      const start = match.index;
      const end = start + matchStr.length;
      const startPosition = model.getPositionAt(start);
      const endPosition = model.getPositionAt(end);
      markers.push({
        severity: monaco.MarkerSeverity.Error,
        message: `Parameter "${paramName}" is not defined.`,
        startLineNumber: startPosition.lineNumber,
        startColumn: startPosition.column,
        endLineNumber: endPosition.lineNumber,
        endColumn: endPosition.column,
        source: SOURCE_NAME,
      });
    }
  }

  monaco.editor.setModelMarkers(model, SOURCE_NAME, markers);
};

const setupSyntaxHighlighting = ({
  model,
  params,
}: {
  model: monaco.editor.ITextModel;
  params: OnechatEsqlParam[];
}): monaco.IDisposable => {
  if (model.getLanguageId() !== ESQL_LANG_ID) {
    return {
      dispose: () => {},
    };
  }
  highlightMissingParams({ model, params }); // Initial validation
  const changeListener = model.onDidChangeContent(() => highlightMissingParams({ model, params }));
  return {
    dispose: () => {
      monaco.editor.setModelMarkers(model, SOURCE_NAME, []);
      changeListener.dispose();
    },
  };
};

const setupCompletionProvider = ({
  params,
}: {
  params: OnechatEsqlParam[];
}): monaco.IDisposable => {
  return monaco.languages.registerCompletionItemProvider(ESQL_LANG_ID, {
    triggerCharacters: ['?'],
    provideCompletionItems: (
      model: monaco.editor.ITextModel,
      position: monaco.Position
    ): monaco.languages.ProviderResult<monaco.languages.CompletionList> => {
      const wordData = model.getWordUntilPosition(position);
      const charBefore = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: wordData.startColumn - 1,
        endLineNumber: position.lineNumber,
        endColumn: wordData.startColumn,
      });

      if (charBefore !== '?') {
        return { suggestions: [] };
      }

      const current = `?${wordData.word}`;
      const range = {
        startLineNumber: position.lineNumber,
        startColumn: wordData.startColumn - 1,
        endLineNumber: position.lineNumber,
        endColumn: wordData.endColumn,
      };

      const suggestions: monaco.languages.CompletionItem[] =
        params
          .filter((param) => param.name && `?${param.name}`.startsWith(current))
          .map((param) => ({
            label: {
              label: `?${param.name}`,
              description: param.description,
            },
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: `?${param.name}`,
            range,
          })) ?? [];

      const currentParamName = wordData.word;
      if (currentParamName) {
        const isDefined = params.some((param) => param.name === currentParamName);
        if (!isDefined) {
          suggestions.unshift({
            label: {
              label: `?${currentParamName}`,
              description: `Create a new parameter named '${currentParamName}'`,
            },
            kind: monaco.languages.CompletionItemKind.Event,
            insertText: `?${currentParamName}`,
            range,
            command: {
              id: COMMAND_ID,
              title: 'Add Parameter',
              arguments: [currentParamName],
            },
            sortText: '0',
          });
        }
      }

      return {
        suggestions,
        incomplete: true,
      };
    },
  });
};

export interface UseEsqlEditorParamsProps {
  params: OnechatEsqlParam[];
  addParam: (name: string) => void;
}

export const useEsqlEditorParams = ({ params, addParam }: UseEsqlEditorParamsProps) => {
  useEffect(() => {
    if (!monaco || !params) {
      return;
    }

    // Set up syntax highlighting for existing models
    const listeners: monaco.IDisposable[] = monaco.editor
      .getModels()
      .map((model) => setupSyntaxHighlighting({ model, params }));

    // Set up syntax highlighting for new models
    const modelCreationListener = monaco.editor.onDidCreateModel((model) => {
      const syntaxHighlighter = setupSyntaxHighlighting({ model, params });
      listeners.push(syntaxHighlighter);
    });

    // Register "Add Parameter" command for use by the completion provider
    const commandListener = monaco.editor.registerCommand(COMMAND_ID, (_, name) => {
      addParam(name);
    });

    // Set up auto-completion for parameters, either existing or new
    const completionProvider = setupCompletionProvider({ params });

    listeners.push(modelCreationListener, commandListener, completionProvider);

    return () => {
      listeners.forEach((listener) => listener.dispose());
    };
  }, [params, addParam]);
};
