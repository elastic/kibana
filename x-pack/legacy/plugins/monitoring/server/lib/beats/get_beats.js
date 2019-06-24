/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import { capitalize, get } from 'lodash';
import { checkParam } from '../error_missing_required';
import { createBeatsQuery } from './create_beats_query';
import { calculateRate } from '../calculate_rate';
import { getDiffCalculation } from './_beats_stats';

export function handleResponse(response, start, end) {
  const hits = get(response, 'hits.hits', []);
  const initial = { ids: new Set(), beats: [] };
  const { beats } = hits.reduce((accum, hit) => {
    const stats = get(hit, '_source.beats_stats');
    const uuid = get(stats, 'beat.uuid');

    // skip this duplicated beat, newer one was already added
    if (accum.ids.has(uuid)) {
      return accum;
    }

    // add another beat summary
    accum.ids.add(uuid);
    const earliestStats = get(hit, 'inner_hits.earliest.hits.hits[0]._source.beats_stats');

    //  add the beat
    const rateOptions = {
      hitTimestamp: get(stats, 'timestamp'),
      earliestHitTimestamp: get(earliestStats, 'timestamp'),
      timeWindowMin: start,
      timeWindowMax: end
    };

    const { rate: bytesSentRate } = calculateRate({
      latestTotal: get(stats, 'metrics.libbeat.output.write.bytes'),
      earliestTotal: get(earliestStats, 'metrics.libbeat.output.write.bytes'),
      ...rateOptions
    });

    const { rate: totalEventsRate } = calculateRate({
      latestTotal: get(stats, 'metrics.libbeat.pipeline.events.total'),
      earliestTotal: get(earliestStats, 'metrics.libbeat.pipeline.events.total'),
      ...rateOptions
    });

    const errorsWrittenLatest = get(stats, 'metrics.libbeat.output.write.errors');
    const errorsWrittenEarliest = get(earliestStats, 'metrics.libbeat.output.write.errors');
    const errorsReadLatest = get(stats, 'metrics.libbeat.output.read.errors');
    const errorsReadEarliest = get(earliestStats, 'metrics.libbeat.output.read.errors');
    const errors = getDiffCalculation(
      errorsWrittenLatest + errorsReadLatest,
      errorsWrittenEarliest + errorsReadEarliest
    );

    accum.beats.push({
      uuid: get(stats, 'beat.uuid'),
      name: get(stats, 'beat.name'),
      type: capitalize(get(stats, 'beat.type')),
      output: capitalize(get(stats, 'metrics.libbeat.output.type')),
      total_events_rate: totalEventsRate,
      bytes_sent_rate: bytesSentRate,
      errors,
      memory: get(stats, 'metrics.beat.memstats.memory_alloc'),
      version: get(stats, 'beat.version')
    });

    return accum;
  }, initial);

  return beats;
}

export async function getBeats(req, beatsIndexPattern, clusterUuid) {
  checkParam(beatsIndexPattern, 'beatsIndexPattern in getBeats');

  const config = req.server.config();
  const start = moment.utc(req.payload.timeRange.min).valueOf();
  const end = moment.utc(req.payload.timeRange.max).valueOf();

  const params = {
    index: beatsIndexPattern,
    size: config.get('xpack.monitoring.max_bucket_size'), // FIXME
    ignoreUnavailable: true,
    filterPath: [ // only filter path can filter for inner_hits
      'hits.hits._source.beats_stats.beat.uuid',
      'hits.hits._source.beats_stats.beat.name',
      'hits.hits._source.beats_stats.beat.host',
      'hits.hits._source.beats_stats.beat.type',
      'hits.hits._source.beats_stats.beat.version',
      'hits.hits._source.beats_stats.metrics.libbeat.output.type',
      'hits.hits._source.beats_stats.metrics.libbeat.output.read.errors',
      'hits.hits._source.beats_stats.metrics.libbeat.output.write.errors',
      'hits.hits._source.beats_stats.metrics.beat.memstats.memory_alloc',

      // latest hits for calculating metrics
      'hits.hits._source.beats_stats.timestamp',
      'hits.hits._source.beats_stats.metrics.libbeat.output.write.bytes',
      'hits.hits._source.beats_stats.metrics.libbeat.pipeline.events.total',

      // earliest hits for calculating metrics
      'hits.hits.inner_hits.earliest.hits.hits._source.beats_stats.timestamp',
      'hits.hits.inner_hits.earliest.hits.hits._source.beats_stats.metrics.libbeat.output.write.bytes',
      'hits.hits.inner_hits.earliest.hits.hits._source.beats_stats.metrics.libbeat.pipeline.events.total',

      // earliest hits for calculating diffs
      'hits.hits.inner_hits.earliest.hits.hits._source.beats_stats.metrics.libbeat.output.read.errors',
      'hits.hits.inner_hits.earliest.hits.hits._source.beats_stats.metrics.libbeat.output.write.errors'
    ],
    body: {
      query: createBeatsQuery({
        start,
        end,
        clusterUuid
      }),
      collapse: {
        field: 'beats_stats.metrics.beat.info.ephemeral_id', // collapse on ephemeral_id to handle restarts
        inner_hits: {
          name: 'earliest',
          size: 1,
          sort: [{ 'beats_stats.timestamp': 'asc' }]
        }
      },
      sort: [
        { 'beats_stats.beat.uuid': { order: 'asc' } }, // need to keep duplicate uuids grouped
        { timestamp: { order: 'desc' } } // need oldest timestamp to come first for rate calcs to work
      ]
    }
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const response = await callWithRequest(req, 'search', params);

  return handleResponse(response, start, end);
}
