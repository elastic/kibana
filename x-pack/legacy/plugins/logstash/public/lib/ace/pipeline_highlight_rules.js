/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const ace = require('brace');
const oop = ace.acequire('ace/lib/oop');
const {
  TextHighlightRules
} = ace.acequire('ace/mode/text_highlight_rules');

export function PipelineHighlightRules() {
  this.name = 'PipelineHighlightRules';
  this.$rules = {
    'start': [
      {
        token: 'comment',
        regex: '#.*$'
      },
      {
        token: 'entity.name.function',
        regex: 'mutate|grok'
      },
      {
        token: 'storage.type',
        regex: 'input|filter|output'
      },
      {
        token: 'string',
        regex: '["](?:(?:\\\\.)|(?:[^"\\\\]))*?["]'
      },
      {
        token: 'keyword.operator',
        regex: '!|\\$|%|&|\\*|\\-\\-|\\-|\\+\\+|\\+|~|===|==|=|!=|!==|!|&&|\\|\\||\\?\\:|\\*=|%=|\\+=|\\-=|&=|\\^=|\\b(?:in|not)'
      },
      {
        token: 'paren.lparen',
        regex: '[[({]'
      },
      {
        token: 'paren.rparen',
        regex: '[\\])}]'
      },
      {
        token: 'text',
        regex: '\\s+'
      }
    ]
  };

  this.normalizeRules();
}

oop.inherits(PipelineHighlightRules, TextHighlightRules);
