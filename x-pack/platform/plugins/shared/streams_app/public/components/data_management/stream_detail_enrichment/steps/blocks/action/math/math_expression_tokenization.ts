/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { monaco } from '@kbn/monaco';

export const STREAMS_MATH_LANGUAGE_ID = 'streams_math';

// Register the language
monaco.languages.register({ id: STREAMS_MATH_LANGUAGE_ID });

export const languageConfiguration: monaco.languages.LanguageConfiguration = {
  wordPattern: /[^()'"\s,]+/g,
  brackets: [['(', ')']],
  autoClosingPairs: [{ open: '(', close: ')' }],
  surroundingPairs: [{ open: '(', close: ')' }],
};

// Use standard token names that Kibana's theme already supports
// Following the same pattern as Lens's math_tokenization.tsx
export const lexerRules: monaco.languages.IMonarchLanguage = {
  defaultToken: 'invalid',
  tokenPostfix: '',
  ignoreCase: true,
  brackets: [{ open: '(', close: ')', token: 'delimiter.parenthesis' }],

  tokenizer: {
    root: [
      // Whitespace
      [/\s+/, 'whitespace'],

      // Numbers: integers and decimals (including scientific notation)
      [/-?(\d*\.)?\d+([eE][+-]?\d+)?/, 'number'],

      // Identifiers (field names and function names) - all treated as keywords
      // This matches the Lens formula editor approach
      [/[a-zA-Z_][a-zA-Z0-9_\-.]*/, 'keyword'],

      // Comparison operators
      [/==|>=|<=|>|</, 'keyword.operator'],

      // Arithmetic operators
      [/[+\-*/%]/, 'keyword.operator'],

      // Delimiters
      [/[(),]/, 'delimiter'],
    ],
  },
};

// Set up the language when Monaco loads it
monaco.languages.onLanguage(STREAMS_MATH_LANGUAGE_ID, () => {
  monaco.languages.setMonarchTokensProvider(STREAMS_MATH_LANGUAGE_ID, lexerRules);
  monaco.languages.setLanguageConfiguration(STREAMS_MATH_LANGUAGE_ID, languageConfiguration);
});
