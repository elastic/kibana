/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ESQL_VIEW_PREFIX } from '@kbn/streams-schema';
import type { QueryStreamHint } from '../../hooks/use_query_stream_hint';

export const QueryStreamHintCallout = ({ hint }: { hint: QueryStreamHint }) => (
  <EuiCallOut
    announceOnMount
    title={i18n.translate('xpack.streams.queryStreamHint.title', {
      defaultMessage: '"{indexName}" is a query stream — use FROM {suggestedView}',
      values: { indexName: hint.indexName, suggestedView: hint.suggestedView },
    })}
    color="warning"
    iconType="help"
    size="s"
  >
    <p>
      {i18n.translate('xpack.streams.queryStreamHint.explanation', {
        defaultMessage:
          'Query streams use a {prefix} prefix for their ES|QL view names and must be referenced with it.',
        values: { prefix: ESQL_VIEW_PREFIX },
      })}
    </p>
  </EuiCallOut>
);
