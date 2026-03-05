/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Builder } from '@elastic/esql';
import { Streams } from '@kbn/streams-schema';
import {
  buildMetadataOption,
  getIndexPatternsForStream,
  normalizeEsqlQuery,
} from '@kbn/streams-schema';

export const getDefaultQueryFrom = (definition: Streams.all.Definition) =>
  BasicPrettyPrinter.print(
    Builder.expression.query([
      Builder.command({
        name: 'from',
        args: [
          Builder.expression.source.index(getIndexPatternsForStream(definition).join(',')),
          buildMetadataOption(),
        ],
      }),
    ])
  );

export const getValidPrefixes = (
  definition: Streams.all.Definition,
  initialEsql?: string
): string[] => {
  const canonicalPrefix = getDefaultQueryFrom(definition);

  if (Streams.ClassicStream.Definition.is(definition) && initialEsql) {
    const wiredStylePrefix = BasicPrettyPrinter.print(
      Builder.expression.query([
        Builder.command({
          name: 'from',
          args: [
            Builder.expression.source.index(`${definition.name},${definition.name}.*`),
            buildMetadataOption(),
          ],
        }),
      ])
    );
    const normalizedInitial = normalizeEsqlQuery(initialEsql);
    const normalizedWired = normalizeEsqlQuery(wiredStylePrefix);
    if (normalizedInitial.startsWith(normalizedWired)) {
      return [canonicalPrefix, wiredStylePrefix];
    }
  }

  return [canonicalPrefix];
};
