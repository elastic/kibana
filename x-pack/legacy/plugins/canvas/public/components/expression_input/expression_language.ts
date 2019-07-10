/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';

interface Language extends monacoEditor.languages.IMonarchLanguage {
  keywords: string[];
  symbols: RegExp;
  escapes: RegExp;
  digits: RegExp;
  boolean: ['true', 'false'];
}

export const language: Language = {
  keywords: [''],

  symbols: /[=|]/,
  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
  digits: /\d+(_+\d+)*/,
  boolean: ['true', 'false'],

  tokenizer: {
    root: [
      [/[{}]/, 'delimiter.bracket'],
      {
        include: 'common',
      },
    ],

    common: [
      // identifiers and keywords
      [
        /[a-z_$][\w$]*/,
        {
          cases: {
            '@keywords': 'keyword',
            '@boolean': 'symbol',
            '@default': 'identifier',
          },
        },
      ],

      [/(@digits)/, 'number'],

      [/"([^"\\]|\\.)*$/, 'string.invalid'], // non-teminated string
      [/'([^'\\]|\\.)*$/, 'string.invalid'], // non-teminated string
      [/"/, 'string', '@string_double'],
      [/'/, 'string', '@string_single'],

      [/@symbols/, 'delimiter'],
    ],

    string_double: [
      [/[^\\"]+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/"/, 'string', '@pop'],
    ],

    string_single: [
      [/[^\\']+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/'/, 'string', '@pop'],
    ],

    bracketCounting: [
      [/\{/, 'delimiter.bracket', '@bracketCounting'],
      [/\}/, 'delimiter.bracket', '@pop'],
      { include: 'common' },
    ],
  },
};
