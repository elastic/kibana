/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { upperFirst } from 'lodash';
import { LegacyRequest } from '../../types';
import { ElasticsearchResponse } from '../../../common/types/es';
import { checkParam } from '../error_missing_required';
import { createBeatsQuery } from './create_beats_query';
import { getDiffCalculation } from './_beats_stats';

export function handleResponse(response: ElasticsearchResponse, beatUuid: string) {
  if (!response.hits || response.hits.hits.length === 0) {
    return {};
  }

  const firstHit = response.hits.hits[0];

  let firstStatsMetrics = null;
  if (
    firstHit.inner_hits?.first_hit?.hits?.hits &&
    firstHit.inner_hits?.first_hit?.hits?.hits.length > 0
  ) {
    firstStatsMetrics =
      firstHit.inner_hits.first_hit.hits.hits[0]._source.beats_stats?.metrics ??
      firstHit.inner_hits.first_hit.hits.hits[0]._source.beat?.stats;
  }

  const stats = firstHit._source.beats_stats ?? firstHit._source?.beat?.stats;
  const statsMetrics = firstHit._source.beats_stats?.metrics ?? firstHit._source?.beat?.stats;

  const eventsTotalFirst = firstStatsMetrics?.libbeat?.pipeline?.events?.total ?? null;
  const eventsEmittedFirst = firstStatsMetrics?.libbeat?.pipeline?.events?.published ?? null;
  const eventsDroppedFirst = firstStatsMetrics?.libbeat?.pipeline?.events?.dropped ?? null;
  const bytesWrittenFirst = firstStatsMetrics?.libbeat?.output?.write?.bytes ?? null;

  const eventsTotalLast = statsMetrics?.libbeat?.pipeline?.events?.total ?? null;
  const eventsEmittedLast = statsMetrics?.libbeat?.pipeline?.events?.published ?? null;
  const eventsDroppedLast = statsMetrics?.libbeat?.pipeline?.events?.dropped ?? null;
  const bytesWrittenLast = statsMetrics?.libbeat?.output?.write?.bytes ?? null;
  const handlesHardLimit =
    firstHit._source.beats_stats?.metrics?.beat?.handles?.limit?.hard ??
    firstHit._source.beat?.stats?.handles?.limit?.hard ??
    null;
  const handlesSoftLimit =
    firstHit._source.beats_stats?.metrics?.beat?.handles?.limit?.soft ??
    firstHit._source.beat?.stats?.handles?.limit?.soft ??
    null;

  return {
    uuid: beatUuid,
    transportAddress: stats?.beat?.host ?? null,
    version: stats?.beat?.version ?? null,
    name: stats?.beat?.name ?? null,
    type: upperFirst(stats?.beat?.type) ?? null,
    output: upperFirst(statsMetrics?.libbeat?.output?.type) ?? null,
    configReloads: statsMetrics?.libbeat?.config?.reloads ?? null,
    uptime:
      firstHit._source.beats_stats?.metrics?.beat?.info?.uptime?.ms ??
      firstHit._source.beat?.stats?.info?.uptime?.ms,
    eventsTotal: getDiffCalculation(eventsTotalLast, eventsTotalFirst) ?? null,
    eventsEmitted: getDiffCalculation(eventsEmittedLast, eventsEmittedFirst) ?? null,
    eventsDropped: getDiffCalculation(eventsDroppedLast, eventsDroppedFirst) ?? null,
    bytesWritten: getDiffCalculation(Number(bytesWrittenLast), Number(bytesWrittenFirst)) ?? null,
    handlesHardLimit,
    handlesSoftLimit,
  };
}

export async function getBeatSummary(
  req: LegacyRequest,
  beatsIndexPattern: string,
  {
    clusterUuid,
    beatUuid,
    start,
    end,
  }: { clusterUuid: string; beatUuid: string; start: number; end: number }
) {
  checkParam(beatsIndexPattern, 'beatsIndexPattern in beats/getBeatSummary');

  const filters = [{ term: { 'beats_stats.beat.uuid': beatUuid } }];
  const params = {
    index: beatsIndexPattern,
    size: 1,
    ignore_unavailable: true,
    filter_path: [
      'hits.hits._source.beats_stats.beat.host',
      'hits.hits._source.beat.stats.beat.host',
      'hits.hits._source.beats_stats.beat.version',
      'hits.hits._source.beat.stats.beat.version',
      'hits.hits._source.beats_stats.beat.name',
      'hits.hits._source.beat.stats.beat.name',
      'hits.hits._source.beats_stats.beat.type',
      'hits.hits._source.beat.stats.beat.type',
      'hits.hits._source.beats_stats.metrics.libbeat.output.type',
      'hits.hits._source.beat.stats.libbeat.output.type',
      'hits.hits._source.beats_stats.metrics.libbeat.pipeline.events.published',
      'hits.hits._source.beat.stats.libbeat.pipeline.events.published',
      'hits.hits._source.beats_stats.metrics.libbeat.pipeline.events.total',
      'hits.hits._source.beat.stats.libbeat.pipeline.events.total',
      'hits.hits._source.beats_stats.metrics.libbeat.pipeline.events.dropped',
      'hits.hits._source.beat.stats.libbeat.pipeline.events.dropped',
      'hits.hits._source.beats_stats.metrics.libbeat.output.write.bytes',
      'hits.hits._source.beat.stats.libbeat.output.write.bytes',
      'hits.hits._source.beats_stats.metrics.libbeat.config.reloads',
      'hits.hits._source.beat.stats.libbeat.config.reloads',
      'hits.hits._source.beats_stats.metrics.beat.info.uptime.ms',
      'hits.hits._source.beat.stats.info.uptime.ms',
      'hits.hits._source.beats_stats.metrics.beat.handles.limit.s',
      'hits.hits._source.beat.stats.handles.limit.hard',
      'hits.hits._source.beats_stats.metrics.beat.handles.limit.soft',
      'hits.hits._source.beat.stats.handles.limit.soft',
      'hits.hits.inner_hits.first_hit.hits.hits._source.beats_stats.metrics.libbeat.pipeline.events.published',
      'hits.hits.inner_hits.first_hit.hits.hits._source.beat.stats.libbeat.pipeline.events.published',
      'hits.hits.inner_hits.first_hit.hits.hits._source.beats_stats.metrics.libbeat.pipeline.events.total',
      'hits.hits.inner_hits.first_hit.hits.hits._source.beat.stats.libbeat.pipeline.events.total',
      'hits.hits.inner_hits.first_hit.hits.hits._source.beats_stats.metrics.libbeat.pipeline.events.dropped',
      'hits.hits.inner_hits.first_hit.hits.hits._source.beat.stats.libbeat.pipeline.events.dropped',
      'hits.hits.inner_hits.first_hit.hits.hits._source.beats_stats.metrics.libbeat.output.write.bytes',
      'hits.hits.inner_hits.first_hit.hits.hits._source.beat.stats.libbeat.output.write.bytes',
    ],
    body: {
      sort: { timestamp: { order: 'desc', unmapped_type: 'long' } },
      query: createBeatsQuery({
        start,
        end,
        clusterUuid,
        filters,
      }),
      collapse: {
        field: 'beats_stats.metrics.beat.info.ephemeral_id', // collapse on ephemeral_id to handle restart
        inner_hits: {
          name: 'first_hit',
          size: 1,
          sort: [
            { 'beats_stats.timestamp': { order: 'asc', unmapped_type: 'long' } },
            { '@timestamp': { order: 'asc', unmapped_type: 'long' } },
          ],
        },
      },
    },
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const response = await callWithRequest(req, 'search', params);

  return handleResponse(response, beatUuid);
}
