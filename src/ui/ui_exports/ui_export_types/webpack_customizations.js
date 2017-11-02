import { isAbsolute } from 'path';

import { escapeRegExp } from 'lodash';

import { concat, merge } from './reduce';
import { alias, wrap, uniqueKeys, mapSpec } from './modify_reduce';

export const __globalImportAliases__ = wrap(alias('webpackAliases'), uniqueKeys('__globalImportAliases__'), merge);
export const noParse = wrap(
  alias('webpackNoParseRules'),
  mapSpec(rule => {
    if (typeof rule === 'string') {
      return new RegExp(`${isAbsolute(rule) ? '^' : ''}${escapeRegExp(rule)}`);
    }

    if (rule instanceof RegExp) {
      return rule;
    }

    throw new Error('Expected noParse rule to be a string or regexp');
  }),
  concat
);
