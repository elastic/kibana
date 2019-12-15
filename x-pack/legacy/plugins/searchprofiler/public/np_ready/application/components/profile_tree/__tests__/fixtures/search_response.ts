/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const searchResponse: any = [
  {
    id: '[L22w_FX2SbqlQYOP5QrYDg] [.apm-agent-configuration] [0]',
    searches: [
      {
        query: [
          {
            type: 'MatchAllDocsQuery',
            description: '*:*',
            time_in_nanos: 1971,
            breakdown: {
              set_min_competitive_score_count: 0,
              match_count: 0,
              shallow_advance_count: 0,
              set_min_competitive_score: 0,
              next_doc: 0,
              match: 0,
              next_doc_count: 0,
              score_count: 0,
              compute_max_score_count: 0,
              compute_max_score: 0,
              advance: 0,
              advance_count: 0,
              score: 0,
              build_scorer_count: 0,
              create_weight: 1970,
              shallow_advance: 0,
              create_weight_count: 1,
              build_scorer: 0,
            },
          },
        ],
        rewrite_time: 908,
        collector: [
          {
            name: 'CancellableCollector',
            reason: 'search_cancelled',
            time_in_nanos: 1176,
            children: [
              { name: 'SimpleTopScoreDocCollector', reason: 'search_top_hits', time_in_nanos: 517 },
            ],
          },
        ],
      },
    ],
    aggregations: [],
  },
  {
    id: '[L22w_FX2SbqlQYOP5QrYDg] [.kibana_1] [0]',
    searches: [
      {
        query: [
          {
            type: 'ConstantScoreQuery',
            description: 'ConstantScore(DocValuesFieldExistsQuery [field=_primary_term])',
            time_in_nanos: 58419,
            breakdown: {
              set_min_competitive_score_count: 0,
              match_count: 0,
              shallow_advance_count: 0,
              set_min_competitive_score: 0,
              next_doc: 5767,
              match: 0,
              next_doc_count: 24,
              score_count: 24,
              compute_max_score_count: 0,
              compute_max_score: 0,
              advance: 2849,
              advance_count: 8,
              score: 1431,
              build_scorer_count: 16,
              create_weight: 8238,
              shallow_advance: 0,
              create_weight_count: 1,
              build_scorer: 40061,
            },
            children: [
              {
                type: 'DocValuesFieldExistsQuery',
                description: 'DocValuesFieldExistsQuery [field=_primary_term]',
                time_in_nanos: 29634,
                breakdown: {
                  set_min_competitive_score_count: 0,
                  match_count: 0,
                  shallow_advance_count: 0,
                  set_min_competitive_score: 0,
                  next_doc: 2434,
                  match: 0,
                  next_doc_count: 24,
                  score_count: 0,
                  compute_max_score_count: 0,
                  compute_max_score: 0,
                  advance: 1506,
                  advance_count: 8,
                  score: 0,
                  build_scorer_count: 16,
                  create_weight: 1586,
                  shallow_advance: 0,
                  create_weight_count: 1,
                  build_scorer: 24059,
                },
              },
            ],
          },
        ],
        rewrite_time: 14670,
        collector: [
          {
            name: 'CancellableCollector',
            reason: 'search_cancelled',
            time_in_nanos: 14706,
            children: [
              {
                name: 'SimpleTopScoreDocCollector',
                reason: 'search_top_hits',
                time_in_nanos: 7851,
              },
            ],
          },
        ],
      },
    ],
    aggregations: [],
  },
  {
    id: '[L22w_FX2SbqlQYOP5QrYDg] [.kibana_task_manager_1] [0]',
    searches: [
      {
        query: [
          {
            type: 'ConstantScoreQuery',
            description: 'ConstantScore(DocValuesFieldExistsQuery [field=_primary_term])',
            time_in_nanos: 30013,
            breakdown: {
              set_min_competitive_score_count: 0,
              match_count: 0,
              shallow_advance_count: 0,
              set_min_competitive_score: 0,
              next_doc: 1497,
              match: 0,
              next_doc_count: 5,
              score_count: 3,
              compute_max_score_count: 0,
              compute_max_score: 0,
              advance: 1058,
              advance_count: 3,
              score: 309,
              build_scorer_count: 6,
              create_weight: 6727,
              shallow_advance: 0,
              create_weight_count: 1,
              build_scorer: 20404,
            },
            children: [
              {
                type: 'DocValuesFieldExistsQuery',
                description: 'DocValuesFieldExistsQuery [field=_primary_term]',
                time_in_nanos: 19795,
                breakdown: {
                  set_min_competitive_score_count: 0,
                  match_count: 0,
                  shallow_advance_count: 0,
                  set_min_competitive_score: 0,
                  next_doc: 600,
                  match: 0,
                  next_doc_count: 5,
                  score_count: 0,
                  compute_max_score_count: 0,
                  compute_max_score: 0,
                  advance: 378,
                  advance_count: 3,
                  score: 0,
                  build_scorer_count: 6,
                  create_weight: 1121,
                  shallow_advance: 0,
                  create_weight_count: 1,
                  build_scorer: 17681,
                },
              },
            ],
          },
        ],
        rewrite_time: 10713,
        collector: [
          {
            name: 'CancellableCollector',
            reason: 'search_cancelled',
            time_in_nanos: 4924,
            children: [
              {
                name: 'SimpleTopScoreDocCollector',
                reason: 'search_top_hits',
                time_in_nanos: 2223,
              },
            ],
          },
        ],
      },
    ],
    aggregations: [],
  },
  {
    id: '[L22w_FX2SbqlQYOP5QrYDg] [.security-7] [0]',
    searches: [
      {
        query: [
          {
            type: 'MatchAllDocsQuery',
            description: '*:*',
            time_in_nanos: 13254,
            breakdown: {
              set_min_competitive_score_count: 6,
              match_count: 0,
              shallow_advance_count: 0,
              set_min_competitive_score: 3016,
              next_doc: 1442,
              match: 0,
              next_doc_count: 10,
              score_count: 10,
              compute_max_score_count: 0,
              compute_max_score: 0,
              advance: 1313,
              advance_count: 6,
              score: 1169,
              build_scorer_count: 12,
              create_weight: 1132,
              shallow_advance: 0,
              create_weight_count: 1,
              build_scorer: 5137,
            },
          },
        ],
        rewrite_time: 755,
        collector: [
          {
            name: 'CancellableCollector',
            reason: 'search_cancelled',
            time_in_nanos: 18172,
            children: [
              {
                name: 'SimpleTopScoreDocCollector',
                reason: 'search_top_hits',
                time_in_nanos: 12507,
              },
            ],
          },
        ],
      },
    ],
    aggregations: [],
  },
  {
    id: '[L22w_FX2SbqlQYOP5QrYDg] [kibana_sample_data_logs] [0]',
    searches: [
      {
        query: [
          {
            type: 'MatchAllDocsQuery',
            description: '*:*',
            time_in_nanos: 12764,
            breakdown: {
              set_min_competitive_score_count: 4,
              match_count: 0,
              shallow_advance_count: 0,
              set_min_competitive_score: 2685,
              next_doc: 1831,
              match: 0,
              next_doc_count: 10,
              score_count: 10,
              compute_max_score_count: 0,
              compute_max_score: 0,
              advance: 1621,
              advance_count: 4,
              score: 835,
              build_scorer_count: 8,
              create_weight: 972,
              shallow_advance: 0,
              create_weight_count: 1,
              build_scorer: 4783,
            },
          },
        ],
        rewrite_time: 691,
        collector: [
          {
            name: 'CancellableCollector',
            reason: 'search_cancelled',
            time_in_nanos: 17700,
            children: [
              {
                name: 'SimpleTopScoreDocCollector',
                reason: 'search_top_hits',
                time_in_nanos: 12839,
              },
            ],
          },
        ],
      },
    ],
    aggregations: [],
  },
];
