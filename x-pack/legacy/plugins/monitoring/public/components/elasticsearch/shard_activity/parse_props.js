/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { capitalize } from 'lodash';
import { formatMetric } from 'plugins/monitoring/lib/format_number';
import { formatDateTimeLocal } from '../../../../common/formatting';

const getIpAndPort = transport => {
  if (transport !== undefined) {
    const matches = transport.match(/([\d\.:]+)\]$/);
    if (matches) {
      return matches[1];
    }
  }
  return transport;
};

const normalizeString = text => {
  return capitalize(text.toLowerCase());
};

export const parseProps = props => {
  const {
    id,
    stage,
    index,
    index_name: indexName,
    primary: isPrimary,
    start_time_in_millis: startTimeInMillis,
    total_time_in_millis: totalTimeInMillis,
    source,
    target,
    translog,
    type,
  } = props;

  const { files, size } = index;

  return {
    name: indexName || index.name,
    shard: `${id} / ${isPrimary ? 'Primary' : 'Replica'}`,
    relocationType: type === 'PRIMARY_RELOCATION' ? 'Primary Relocation' : normalizeString(type),
    stage: normalizeString(stage),
    startTime: formatDateTimeLocal(startTimeInMillis),
    totalTime: formatMetric(Math.floor(totalTimeInMillis / 1000), '00:00:00'),
    isCopiedFromPrimary: !isPrimary || type === 'PRIMARY_RELOCATION',
    sourceName: source.name === undefined ? 'n/a' : source.name,
    targetName: target.name,
    sourceTransportAddress: getIpAndPort(source.transport_address),
    targetTransportAddress: getIpAndPort(target.transport_address),
    isSnapshot: type === 'SNAPSHOT',
    repo: source.repository,
    snapshot: source.snapshot,
    filesPercent: files.percent,
    filesDone: files.reused ? files.reused : files.recovered,
    filesTotal: files.total,
    bytesPercent: size.percent,
    bytesDone: formatMetric(size.recovered_in_bytes + size.reused_in_bytes, 'byte'),
    bytesTotal: formatMetric(size.total_in_bytes, 'byte'),
    hasTranslog: translog.total > 0,
    translogPercent: translog.percent,
    translogDone: translog.total,
    translogTotal: translog.total_on_start,
  };
};
