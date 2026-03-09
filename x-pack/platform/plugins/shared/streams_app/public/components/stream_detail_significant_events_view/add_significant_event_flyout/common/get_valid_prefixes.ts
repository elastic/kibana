/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Builder } from '@elastic/esql';
import {
  Streams,
  buildMetadataOption,
  getIndexPatternsForStream,
  normalizeEsqlQuery,
} from '@kbn/streams-schema';
import type { ValidPrefixes } from '../../../esql_query_editor';

const getDefaultQueryFrom = (definition: Streams.all.Definition) =>
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
): ValidPrefixes => {
  const primary = getDefaultQueryFrom(definition);

  // Classic streams use "FROM <name>" as the primary prefix, but older significant events
  // may have been saved with the wired-style pattern "FROM <name>,<name>.*".
  // When we detect that the initial query uses the wired-style pattern, we accept both
  // so existing queries remain valid without forcing users to re-edit them.
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
      return { primary, alsoAllowed: [wiredStylePrefix] };
    }
  }

  return { primary };
};
