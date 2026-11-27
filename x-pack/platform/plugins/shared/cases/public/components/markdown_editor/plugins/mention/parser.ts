/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin } from 'unified';
import type { RemarkTokenizer } from '@elastic/eui';
import { MENTION_TOKEN_PATTERN } from '../../../../../common/utils/mentions';

export const ID = 'mention';

const MENTION_AT_START = new RegExp(`^${MENTION_TOKEN_PATTERN}`);

/** Parses `@[name](uid)` before the link tokenizer can read it as a link. */
export const MentionParser: Plugin = function () {
  const Parser = this.Parser;
  const tokenizers = Parser.prototype.inlineTokenizers;
  const methods = Parser.prototype.inlineMethods;

  const tokenizeMention: RemarkTokenizer = function (eat, value, silent) {
    const match = MENTION_AT_START.exec(value);

    if (match == null) {
      return false;
    }

    if (silent) {
      return true;
    }

    const [token, name, uid] = match;

    return eat(token)({ type: ID, name, uid });
  };

  tokenizeMention.locator = (value: string, fromIndex: number) => value.indexOf('@[', fromIndex);

  tokenizers[ID] = tokenizeMention;
  methods.splice(methods.indexOf('text'), 0, ID);
};
