/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getIndexPatternsForStream } from '@kbn/streams-schema';
import type { Condition } from '@kbn/streamlang';
import { conditionToESQL } from '@kbn/streamlang';
import { useKibana } from '../../../../../hooks/use_kibana';
import { useStreamDetail } from '../../../../../hooks/use_stream_detail';

export const useStreamFeatureDiscoverUrl = ({ filter }: { filter: Condition }) => {
  const {
    services: { discover },
  } = useKibana();

  const { definition } = useStreamDetail();
  const esqlQuery = `FROM ${getIndexPatternsForStream(definition.stream).join(',')}
      | WHERE ${conditionToESQL(filter)}`;

  return discover.locator?.getRedirectUrl({
    query: { esql: esqlQuery },
    timeRange: { from: 'now-24h', to: 'now' },
  });
};
