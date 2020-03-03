/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ace from 'ace';

const { TextHighlightRules } = ace.acequire('ace/mode/text_highlight_rules');

export class GrokHighlightRules extends TextHighlightRules {
  constructor() {
    super();
    this.$rules = {
      start: [
        {
          token: ['grokStart', 'grokPatternName', 'grokSeparator', 'grokFieldName', 'grokEnd'],
          regex: '(%{)([^:]+)(:)([^:]+)(})',
        },
        {
          token: [
            'grokStart',
            'grokPatternName',
            'grokSeparator',
            'grokFieldName',
            'grokSeparator',
            'grokFieldType',
            'grokEnd',
          ],
          regex: '(%{)([^:]+)(:)([^:]+)(:)([^:]+)(})',
        },
        {
          token: (escapeToken /* regexToken */) => {
            if (escapeToken) {
              return ['grokEscape', 'grokEscaped'];
            }
            return 'grokRegex';
          },
          regex: '(\\\\)?([\\[\\]\\(\\)\\?\\:\\|])',
        },
      ],
    };
  }
}
