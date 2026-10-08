/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject } from 'rxjs';
import { AI_INSIGHTS_EMBEDDABLE_TYPE } from '../../common/ai_insights/constants';
import {
  buildDashboardContext,
  extractEsqlIndexPatterns,
  summarizeQuery,
} from './build_dashboard_context';

describe('buildDashboardContext', () => {
  it('returns empty context when parent is not a dashboard', () => {
    expect(buildDashboardContext({}, 'self')).toEqual({
      title: '',
      description: '',
      panels: [],
      data_sources: [],
    });
  });

  it('collects panel titles, data sources, and skips AI insights panels', () => {
    const parentApi = {
      children$: new BehaviorSubject({
        self: { type: AI_INSIGHTS_EMBEDDABLE_TYPE },
        otherInsight: { type: AI_INSIGHTS_EMBEDDABLE_TYPE },
        chart: {
          type: 'lens',
          title$: new BehaviorSubject(undefined),
          hideTitle$: new BehaviorSubject(false),
          defaultTitle$: new BehaviorSubject('Latency'),
          esql$: new BehaviorSubject([{ esql: 'FROM metrics | STATS count()' }]),
          approximationApplied$: new BehaviorSubject(false),
          dataViews$: new BehaviorSubject([
            {
              id: 'dv1',
              title: 'kibana_sample_data_flights',
              name: 'Flights',
              timeFieldName: 'timestamp',
              getIndexPattern: () => 'kibana_sample_data_flights',
              getName: () => 'Flights',
            },
          ]),
        },
      }),
      dataViews$: new BehaviorSubject([]),
      getSerializedState: () => ({
        attributes: {
          title: 'Ops dashboard',
          description: 'Cloud SQL',
          panels: [
            {
              id: 'chart',
              type: 'lens',
              config: { title: 'Serialized title ignored when live title exists' },
            },
            {
              id: 'offline-panel',
              type: 'vis',
              config: { attributes: { title: '[Flights] Total Flights' } },
            },
          ],
        },
      }),
    };

    expect(buildDashboardContext(parentApi, 'self')).toEqual({
      title: 'Ops dashboard',
      description: 'Cloud SQL',
      panels: [
        {
          id: 'chart',
          title: 'Latency',
          type: 'lens',
          esql: 'FROM metrics | STATS count()',
        },
        {
          id: 'offline-panel',
          title: '[Flights] Total Flights',
          type: 'vis',
        },
      ],
      data_sources: [
        {
          id: 'dv1',
          title: 'Flights',
          index_pattern: 'kibana_sample_data_flights',
          time_field: 'timestamp',
        },
        {
          title: 'Latency',
          index_pattern: 'metrics',
        },
      ],
    });
  });
});

describe('summarizeQuery', () => {
  it('reads KQL and ES|QL queries', () => {
    expect(summarizeQuery({ language: 'kuery', query: 'service.name: api' })).toBe(
      'service.name: api'
    );
    expect(summarizeQuery({ esql: 'FROM logs' })).toBe('FROM logs');
  });
});

describe('extractEsqlIndexPatterns', () => {
  it('extracts indexes from ES|QL FROM clauses on any dashboard', () => {
    expect(extractEsqlIndexPatterns('FROM logs-*, metrics-* | STATS count()')).toEqual([
      'logs-*',
      'metrics-*',
    ]);
    expect(extractEsqlIndexPatterns('FROM "traces-apm-*" METADATA _id')).toEqual(['traces-apm-*']);
  });
});

describe('buildDashboardContext ES|QL fallback', () => {
  it('derives data sources from ES|QL when panels do not publish data views', () => {
    const parentApi = {
      children$: new BehaviorSubject({
        chart: {
          type: 'lens',
          title$: new BehaviorSubject(undefined),
          hideTitle$: new BehaviorSubject(false),
          defaultTitle$: new BehaviorSubject('Errors'),
          esql$: new BehaviorSubject([{ esql: 'FROM logs-* | STATS count()' }]),
          approximationApplied$: new BehaviorSubject(false),
        },
      }),
      getSerializedState: () => ({
        attributes: {
          title: 'Logs',
          panels: [{ id: 'chart', type: 'lens' }],
        },
      }),
    };

    expect(buildDashboardContext(parentApi, 'self').data_sources).toEqual([
      {
        title: 'Errors',
        index_pattern: 'logs-*',
      },
    ]);
  });
});
