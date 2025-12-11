/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monaco } from '@kbn/monaco';
import {
  ALL_MATH_FUNCTIONS,
  getMathFunctionDefinition,
  getMathParameterNames,
} from '@kbn/streamlang';
import { MATH_LANGUAGE_ID } from './math_expression_tokenization';

/**
 * Creates completion items from the shared function definitions
 */
function createCompletionItems(range: monaco.IRange): monaco.languages.CompletionItem[] {
  return ALL_MATH_FUNCTIONS.map((func, index) => {
    const params = getMathParameterNames(func);
    return {
      // Show signature as the label (like Lens does)
      label: {
        label: func.name,
        detail:
          params.length > 0 ? `(${params.map((p) => `[${p.replace('?', '')}]`).join(', ')})` : '()',
        description: func.isConstant ? 'constant' : '',
      },
      kind: func.isConstant
        ? monaco.languages.CompletionItemKind.Constant
        : monaco.languages.CompletionItemKind.Function,
      insertText: func.isConstant ? `${func.name}()` : `${func.name}($0)`,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      detail: func.signature,
      documentation: func.description,
      range,
      sortText: String(index).padStart(3, '0'), // Maintain order
    };
  });
}

/**
 * Registers the completion provider for the math expression language.
 * Returns a disposable that should be called on component unmount.
 */
export function registerMathCompletionProvider(): monaco.IDisposable {
  return monaco.languages.registerCompletionItemProvider(MATH_LANGUAGE_ID, {
    triggerCharacters: ['(', ' '],

    provideCompletionItems(
      model: monaco.editor.ITextModel,
      position: monaco.Position
    ): monaco.languages.ProviderResult<monaco.languages.CompletionList> {
      // Get the word at the current position
      const wordInfo = model.getWordUntilPosition(position);

      // Create the range for the completion
      const range: monaco.IRange = {
        startLineNumber: position.lineNumber,
        startColumn: wordInfo.startColumn,
        endLineNumber: position.lineNumber,
        endColumn: wordInfo.endColumn,
      };

      // Filter suggestions based on what the user has typed
      const prefix = wordInfo.word.toLowerCase();
      let suggestions = createCompletionItems(range);

      if (prefix) {
        suggestions = suggestions.filter((item) => {
          const label =
            typeof item.label === 'string' ? item.label : (item.label as { label: string }).label;
          return label.toLowerCase().startsWith(prefix);
        });
      }

      return {
        suggestions,
        incomplete: false,
      };
    },
  });
}

/**
 * Finds the function name at or before the given position in the text.
 * Returns the function name and the current parameter index.
 */
function findFunctionContext(
  text: string,
  offset: number
): { functionName: string; parameterIndex: number } | null {
  // Work backwards from cursor to find the function name
  let parenDepth = 0;
  let parameterIndex = 0;
  let functionStart = -1;
  let functionEnd = -1;

  for (let i = offset - 1; i >= 0; i--) {
    const char = text[i];

    if (char === ')') {
      parenDepth++;
    } else if (char === '(') {
      if (parenDepth === 0) {
        // Found our opening paren, now find the function name
        functionEnd = i;
        // Go back to find the start of the function name
        let j = i - 1;
        while (j >= 0 && /[a-zA-Z_]/.test(text[j])) {
          j--;
        }
        functionStart = j + 1;
        break;
      }
      parenDepth--;
    } else if (char === ',' && parenDepth === 0) {
      parameterIndex++;
    }
  }

  if (functionStart >= 0 && functionEnd > functionStart) {
    const functionName = text.substring(functionStart, functionEnd).toLowerCase();
    return { functionName, parameterIndex };
  }

  return null;
}

/**
 * Registers the signature help provider for showing function parameter hints.
 * Returns a disposable that should be called on component unmount.
 */
export function registerMathSignatureHelpProvider(): monaco.IDisposable {
  return monaco.languages.registerSignatureHelpProvider(MATH_LANGUAGE_ID, {
    signatureHelpTriggerCharacters: ['(', ','],
    signatureHelpRetriggerCharacters: [','],

    provideSignatureHelp(
      model: monaco.editor.ITextModel,
      position: monaco.Position
    ): monaco.languages.ProviderResult<monaco.languages.SignatureHelpResult> {
      const text = model.getValue();
      const offset = model.getOffsetAt(position);

      const context = findFunctionContext(text, offset);
      if (!context) {
        return null;
      }

      const funcMeta = getMathFunctionDefinition(context.functionName);
      if (!funcMeta) {
        return null;
      }

      const paramNames = getMathParameterNames(funcMeta);
      if (paramNames.length === 0) {
        return null;
      }

      const parameters: monaco.languages.ParameterInformation[] = paramNames.map((param) => ({
        label: param,
        documentation: undefined,
      }));

      const signature: monaco.languages.SignatureInformation = {
        label: funcMeta.signature,
        documentation: funcMeta.description,
        parameters,
      };

      return {
        value: {
          signatures: [signature],
          activeSignature: 0,
          activeParameter: Math.min(context.parameterIndex, parameters.length - 1),
        },
        dispose: () => {},
      };
    },
  });
}
