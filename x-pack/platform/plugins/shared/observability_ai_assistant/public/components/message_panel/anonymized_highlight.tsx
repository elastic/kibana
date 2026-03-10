/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Plugin } from 'unified';
import type { RemarkTokenizer } from '@elastic/eui';

/**
 * Markdown parser for anonymized inline syntax.
 * Matches `!{anonymized{...}}` and passes the JSON configuration on the node.
 */
export const anonymizedHighlightPlugin: Plugin = function () {
  const Parser = this.Parser;
  const tokenizers = Parser.prototype.inlineTokenizers;
  const methods = Parser.prototype.inlineMethods;
  const TOKEN = '!{anonymized';
  const TOKEN_LEN = TOKEN.length;

  const tokenizeAnonymized: RemarkTokenizer = function (eat, value, silent) {
    if (!value.startsWith(TOKEN)) return false;

    const nextChar = value.charAt(TOKEN_LEN);
    if (nextChar !== '{' && nextChar !== '}') return false;

    if (silent) return true;

    // Checking for the JSON configuration block
    const hasConfig = nextChar === '{';

    let match = TOKEN;
    let configuration = {} as Record<string, unknown>;

    if (hasConfig) {
      let configStr = '';
      let open = 0;
      // Start reading after the keyword
      const startIdx = TOKEN_LEN;
      for (let i = startIdx; i < value.length; i++) {
        const ch = value[i];
        if (ch === '{') {
          open++;
          configStr += ch;
        } else if (ch === '}') {
          open--;
          if (open === -1) {
            break; // reached the final closing bracket of the whole syntax
          }
          configStr += ch;
        } else {
          configStr += ch;
        }
      }

      match += configStr;

      try {
        configuration = JSON.parse(configStr);
      } catch (e) {
        const now = eat.now();
        this.file.fail(`Unable to parse anonymized JSON configuration: ${e}`, {
          line: now.line,
          column: now.column + TOKEN_LEN,
        });
      }
    }

    match += '}';

    return eat(match)({
      type: 'anonymized',
      ...configuration,
    });
  };

  tokenizeAnonymized.locator = (value: any, fromIndex: number) => value.indexOf(TOKEN, fromIndex);

  tokenizers.anonymized = tokenizeAnonymized;
  methods.splice(methods.indexOf('text'), 0, 'anonymized');
};
