/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin } from 'unified';
import type { RemarkTokenizer } from '@elastic/eui';
import * as i18n from './translations';

export const ID = 'timeline';
const PREFIX = '[';

export const TimelineParser: Plugin = function () {
  const Parser = this.Parser;
  const tokenizers = Parser.prototype.blockTokenizers;
  const methods = Parser.prototype.blockMethods;

  const tokenizeTimeline: RemarkTokenizer = function (eat, value, silent) {
    if (
      value.startsWith(PREFIX) === false ||
      (value.startsWith(PREFIX) === true && !value.includes('timelines?timeline=(id'))
    ) {
      return false;
    }

    let index = 0;
    const nextChar = value[index];

    if (nextChar !== PREFIX) {
      return false;
    }

    if (silent) {
      return true;
    }

    function readArg(open: string, close: string) {
      if (value[index] !== open) {
        throw new Error(i18n.NO_PARENTHESES);
      }

      index++;

      let body = '';
      let openBrackets = 0;

      for (; index < value.length; index++) {
        const char = value[index];

        if (char === close && openBrackets === 0) {
          index++;
          return body;
        } else if (char === close) {
          openBrackets--;
        } else if (char === open) {
          openBrackets++;
        }

        body += char;
      }

      return '';
    }

    const timelineTitle = readArg(PREFIX, ']');
    const timelineUrl = readArg('(', ')');
    const match = `[${timelineTitle}](${timelineUrl})`;

    return eat(match)({
      type: ID,
      match,
    });
  };

  tokenizeTimeline.locator = (value: string, fromIndex: number) => {
    return value.indexOf(PREFIX, fromIndex);
  };

  tokenizers.timeline = tokenizeTimeline;
  methods.splice(methods.indexOf('url'), 0, ID);
};
