/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLAstItem, ESQLCommandOption } from '@kbn/esql-ast';
import { BasicPrettyPrinter, Parser, isOptionNode } from '@kbn/esql-ast';
import { get } from 'lodash';

const isByBucketArg = (arg: ESQLAstItem) =>
  isOptionNode(arg) && arg.name === 'by' && arg.text.includes('BUCKET(');

export const stripBucketClauseFromQuery = (query: string | null): string | null => {
  if (!query) return query;

  try {
    const { root } = Parser.parse(query);
    const commands = root.commands;
    for (const cmd of commands) {
      const bucketCmdIndex = cmd.args.findIndex((arg) => isByBucketArg(arg));
      if (bucketCmdIndex > -1) {
        const bucketOptionCmd = cmd.args[bucketCmdIndex] as ESQLCommandOption;
        bucketOptionCmd.args = bucketOptionCmd.args.filter(
          (arg) =>
            !(
              get(arg, 'type') === 'function' &&
              get(arg, 'subtype') === 'variadic-call' &&
              (get(arg, 'name') === 'bucket' || get(arg, 'name') === 'tbucket')
            )
        );
        if (bucketOptionCmd.args.length === 0) {
          cmd.args.splice(bucketCmdIndex, 1);
        }
      }
    }
    return BasicPrettyPrinter.print(root);
  } catch (_) {
    // stripping this clause is a best effort, if parsing fails, just return the original query
    return query;
  }
};
