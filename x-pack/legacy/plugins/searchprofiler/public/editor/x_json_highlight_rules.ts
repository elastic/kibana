/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ace from 'brace';
const oop = ace.acequire('ace/lib/oop');
const { JsonHighlightRules } = ace.acequire('ace/mode/json_highlight_rules');
const { TextHighlightRules } = ace.acequire('ace/mode/text_highlight_rules');

/*
 * The rules below were copied from ./src/legacy/core_plugins/console/public/src/sense_editor/mode/x_json_highlight_rules.js
 *
 * It is very likely that this code will move (or be removed) in future but for now
 * it enables syntax highlight for extended json.
 */

const xJsonRules = {
  start: [
    {
      token: [
        'variable',
        'whitespace',
        'ace.punctuation.colon',
        'whitespace',
        'punctuation.start_triple_quote',
      ],
      regex: '("(?:[^"]*_)?script"|"inline"|"source")(\\s*?)(:)(\\s*?)(""")',
      next: 'script-start',
      merge: false,
      push: true,
    },
    {
      token: 'variable', // single line
      regex: '["](?:(?:\\\\.)|(?:[^"\\\\]))*?["]\\s*(?=:)',
    },
    {
      token: 'punctuation.start_triple_quote',
      regex: '"""',
      next: 'string_literal',
      merge: false,
      push: true,
    },
    {
      token: 'string', // single line
      regex: '["](?:(?:\\\\.)|(?:[^"\\\\]))*?["]',
    },
    {
      token: 'constant.numeric', // hex
      regex: '0[xX][0-9a-fA-F]+\\b',
    },
    {
      token: 'constant.numeric', // float
      regex: '[+-]?\\d+(?:(?:\\.\\d*)?(?:[eE][+-]?\\d+)?)?\\b',
    },
    {
      token: 'constant.language.boolean',
      regex: '(?:true|false)\\b',
    },
    {
      token: 'invalid.illegal', // single quoted strings are not allowed
      regex: "['](?:(?:\\\\.)|(?:[^'\\\\]))*?[']",
    },
    {
      token: 'invalid.illegal', // comments are not allowed
      regex: '\\/\\/.*$',
    },
    {
      token: 'paren.lparen',
      merge: false,
      regex: '{',
      next: 'start',
      push: true,
    },
    {
      token: 'paren.lparen',
      merge: false,
      regex: '[[(]',
    },
    {
      token: 'paren.rparen',
      merge: false,
      regex: '[\\])]',
    },
    {
      token: 'paren.rparen',
      regex: '}',
      merge: false,
      next: 'pop',
    },
    {
      token: 'punctuation.comma',
      regex: ',',
    },
    {
      token: 'punctuation.colon',
      regex: ':',
    },
    {
      token: 'whitespace',
      regex: '\\s+',
    },
    {
      token: 'text',
      regex: '.+?',
    },
  ],
  string_literal: [
    {
      token: 'punctuation.end_triple_quote',
      regex: '"""',
      next: 'pop',
    },
    {
      token: 'multi_string',
      regex: '.',
    },
  ],
};

function XJsonHighlightRules(this: any) {
  this.$rules = xJsonRules;
}

oop.inherits(XJsonHighlightRules, JsonHighlightRules);

export function getRules() {
  const ruleset: any = new (XJsonHighlightRules as any)();
  ruleset.embedRules(TextHighlightRules, 'text-', [
    {
      token: 'punctuation.end_triple_quote',
      regex: '"""',
      next: 'pop',
    },
  ]);
  ruleset.normalizeRules();
  return ruleset.getRules();
}
