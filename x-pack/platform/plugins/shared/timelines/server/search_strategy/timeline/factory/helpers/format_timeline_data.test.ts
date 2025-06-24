/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { eventHit } from '@kbn/securitysolution-t-grid';
import { EventHit } from '../../../../../common/search_strategy';
import { formatTimelineData } from './format_timeline_data';

describe('formatTimelineData', () => {
  it('should properly format the timeline data', async () => {
    const res = await formatTimelineData(
      [eventHit],
      [
        '@timestamp',
        'host.name',
        'destination.ip',
        'source.ip',
        'source.geo.location',
        'threat.enrichments.matched.field',
      ],
      false
    );
    expect(res).toEqual([
      {
        cursor: {
          tiebreaker: 'beats-ci-immutable-ubuntu-1804-1605624279743236239',
          value: '1605624488922',
        },
        node: {
          _id: 'tkCt1nUBaEgqnrVSZ8R_',
          _index: 'auditbeat-7.8.0-2020.11.05-000003',
          data: [
            {
              field: '@timestamp',
              value: ['2020-11-17T14:48:08.922Z'],
            },
            {
              field: 'host.name',
              value: ['beats-ci-immutable-ubuntu-1804-1605624279743236239'],
            },
            {
              field: 'threat.enrichments.matched.field',
              value: [
                'matched_field',
                'other_matched_field',
                'matched_field_2',
                'host.name',
                'host.hostname',
                'host.architecture',
              ],
            },
            {
              field: 'source.geo.location',
              value: [`{"lon":118.7778,"lat":32.0617}`],
            },
          ],
          ecs: {
            '@timestamp': ['2020-11-17T14:48:08.922Z'],
            _id: 'tkCt1nUBaEgqnrVSZ8R_',
            _index: 'auditbeat-7.8.0-2020.11.05-000003',
            agent: {
              type: ['auditbeat'],
            },
            event: {
              action: ['process_started'],
              category: ['process'],
              dataset: ['process'],
              kind: ['event'],
              module: ['system'],
              type: ['start'],
            },
            host: {
              id: ['e59991e835905c65ed3e455b33e13bd6'],
              ip: ['10.224.1.237', 'fe80::4001:aff:fee0:1ed', '172.17.0.1'],
              name: ['beats-ci-immutable-ubuntu-1804-1605624279743236239'],
              os: {
                family: ['debian'],
              },
            },
            message: ['Process go (PID: 4313) by user jenkins STARTED'],
            process: {
              args: ['go', 'vet', './...'],
              entity_id: ['Z59cIkAAIw8ZoK0H'],
              executable: [
                '/var/lib/jenkins/workspace/Beats_beats_PR-22624/.gvm/versions/go1.14.7.linux.amd64/bin/go',
              ],
              hash: {
                sha1: ['1eac22336a41e0660fb302add9d97daa2bcc7040'],
              },
              name: ['go'],
              pid: ['4313'],
              ppid: ['3977'],
              working_directory: [
                '/var/lib/jenkins/workspace/Beats_beats_PR-22624/src/github.com/elastic/beats/libbeat',
              ],
            },
            timestamp: '2020-11-17T14:48:08.922Z',
            user: {
              name: ['jenkins'],
            },
            threat: {
              enrichments: [
                {
                  feed: { name: [] },
                  indicator: {
                    provider: ['yourself'],
                    reference: [],
                  },
                  matched: {
                    atomic: ['matched_atomic'],
                    field: ['matched_field', 'other_matched_field'],
                    type: [],
                  },
                },
                {
                  feed: { name: [] },
                  indicator: {
                    provider: ['other_you'],
                    reference: [],
                  },
                  matched: {
                    atomic: ['matched_atomic_2'],
                    field: ['matched_field_2'],
                    type: [],
                  },
                },
                {
                  feed: {
                    name: [],
                  },
                  indicator: {
                    provider: [],
                    reference: [],
                  },
                  matched: {
                    atomic: ['MacBook-Pro-de-Gloria.local'],
                    field: ['host.name'],
                    type: ['indicator_match_rule'],
                  },
                },
                {
                  feed: {
                    name: [],
                  },
                  indicator: {
                    provider: [],
                    reference: [],
                  },
                  matched: {
                    atomic: ['MacBook-Pro-de-Gloria.local'],
                    field: ['host.hostname'],
                    type: ['indicator_match_rule'],
                  },
                },
                {
                  feed: {
                    name: [],
                  },
                  indicator: {
                    provider: [],
                    reference: [],
                  },
                  matched: {
                    atomic: ['x86_64'],
                    field: ['host.architecture'],
                    type: ['indicator_match_rule'],
                  },
                },
                {
                  feed: {
                    name: [],
                  },
                  indicator: {
                    provider: [],
                    reference: [],
                  },
                  matched: {
                    atomic: ['MacBook-Pro-de-Gloria.local'],
                    field: ['host.name'],
                    type: ['indicator_match_rule'],
                  },
                },
                {
                  feed: {
                    name: [],
                  },
                  indicator: {
                    provider: [],
                    reference: [],
                  },
                  matched: {
                    atomic: ['MacBook-Pro-de-Gloria.local'],
                    field: ['host.hostname'],
                    type: ['indicator_match_rule'],
                  },
                },
              ],
            },
          },
        },
      },
    ]);
  });

  it('should properly format the rule signal results', async () => {
    const response: EventHit = {
      _index: '.siem-signals-patrykkopycinski-default-000007',
      _id: 'a77040f198355793c35bf22b900902371309be615381f0a2ec92c208b6132562',
      _score: 0,
      _source: {},
      fields: {
        'kibana.alert.rule.from': ['now-360s'],
        '@timestamp': ['2021-01-09T13:41:40.517Z'],
        'kibana.alert.rule.type': ['threshold'],
        'kibana.alert.rule.uuid': ['696c24e0-526d-11eb-836c-e1620268b945'],
        'kibana.alert.risk_score': [21],
        'kibana.alert.workflow_status': ['open'],
        'event.kind': ['signal'],
        'kibana.alert.original_time': ['2021-01-09T13:39:32.595Z'],
        'kibana.alert.severity': ['low'],
        'kibana.alert.rule.version': ['1'],
        'kibana.alert.rule.name': ['Threshold test'],
        'kibana.alert.rule.to': ['now'],
        'kibana.alert.rule.building_block_type': [],
        'kibana.alert.rule.note': [],
        'kibana.alert.rule.timeline_id': [],
        'kibana.alert.rule.timeline_title': [],
        'kibana.alert.rule.exceptions_list': [],
        'kibana.alert.threshold_result': [
          {
            count: 10000,
            value: '2a990c11-f61b-4c8e-b210-da2574e9f9db',
          },
        ],
      },
      sort: ['1610199700517'],
    };

    expect(
      await formatTimelineData(
        [response],
        ['@timestamp', 'host.name', 'destination.ip', 'source.ip'],
        false
      )
    ).toEqual([
      {
        cursor: {
          tiebreaker: null,
          value: '',
        },
        node: {
          _id: 'a77040f198355793c35bf22b900902371309be615381f0a2ec92c208b6132562',
          _index: '.siem-signals-patrykkopycinski-default-000007',
          data: [
            {
              field: '@timestamp',
              value: ['2021-01-09T13:41:40.517Z'],
            },
          ],
          ecs: {
            '@timestamp': ['2021-01-09T13:41:40.517Z'],
            timestamp: '2021-01-09T13:41:40.517Z',
            _id: 'a77040f198355793c35bf22b900902371309be615381f0a2ec92c208b6132562',
            _index: '.siem-signals-patrykkopycinski-default-000007',
            event: {
              kind: ['signal'],
            },
            kibana: {
              alert: {
                original_time: ['2021-01-09T13:39:32.595Z'],
                workflow_status: ['open'],
                threshold_result: [
                  '{"count":10000,"value":"2a990c11-f61b-4c8e-b210-da2574e9f9db"}',
                ],
                severity: ['low'],
                risk_score: ['21'],
                rule: {
                  building_block_type: [],
                  exceptions_list: [],
                  from: ['now-360s'],
                  uuid: ['696c24e0-526d-11eb-836c-e1620268b945'],
                  name: ['Threshold test'],
                  to: ['now'],
                  type: ['threshold'],
                  version: ['1'],
                  timeline_id: [],
                  timeline_title: [],
                  note: [],
                },
              },
            },
          },
        },
      },
    ]);
  });

  it('should properly format the inventory rule signal results', async () => {
    const response: EventHit = {
      _index: '.internal.alerts-observability.metrics.alerts-default-000001',
      _id: '3fef4a4c-3d96-4e79-b4e5-158a0461d577',
      _score: null,
      fields: {
        'kibana.alert.workflow_status': ['open'],
        'kibana.alert.status': ['active'],
        'kibana.alert.rule.uuid': ['15d82f10-0926-11ed-bece-6b0c033d0075'],
        'kibana.alert.reason': [
          'CPU usage is 37.8% in the last 1 day for gke-edge-oblt-pool-1-9a60016d-7dvq. Alert when > 10%.',
        ],
        'kibana.alert.rule.producer': ['infrastructure'],
        'kibana.alert.rule.consumer': ['infrastructure'],
        'kibana.alert.rule.category': ['Inventory'],
        'kibana.alert.start': ['2022-07-21T20:00:35.848Z'],
        'kibana.alert.rule.rule_type_id': ['metrics.alert.inventory.threshold'],
        'event.action': ['active'],
        'kibana.alert.duration.us': [9502040000],
        '@timestamp': ['2022-07-21T22:38:57.888Z'],
        'kibana.alert.instance.id': ['gke-edge-oblt-pool-1-9a60016d-7dvq'],
        'kibana.alert.rule.name': ['test 1212'],
        'kibana.alert.rule.execution.uuid': ['37498c42-0190-4a83-adfa-c7e5f817f977'],
        'kibana.alert.uuid': ['3fef4a4c-3d96-4e79-b4e5-158a0461d577'],
        'kibana.space_ids': ['default'],
        'kibana.version': ['8.4.0'],
        'event.kind': ['signal'],
        'kibana.alert.rule.parameters': [
          {
            sourceId: 'default',
            nodeType: 'host',
            criteria: [
              {
                comparator: '>',
                timeSize: 1,
                metric: 'cpu',
                threshold: [10],
                customMetric: {
                  aggregation: 'avg',
                  id: 'alert-custom-metric',
                  field: '',
                  type: 'custom',
                },
                timeUnit: 'd',
              },
            ],
          },
        ],
      },
      sort: ['1'],
    };

    expect(
      await formatTimelineData(
        [response],
        [
          'kibana.alert.status',
          '@timestamp',
          'kibana.alert.duration.us',
          'kibana.alert.reason',
          '*',
          'kibana.alert.duration.us',
          'kibana.alert.evaluation.threshold',
          'kibana.alert.evaluation.value',
          'kibana.alert.reason',
          'kibana.alert.rule.category',
          'kibana.alert.rule.name',
          'kibana.alert.status',
          'kibana.alert.uuid',
          'kibana.alert.start',
          '@timestamp',
          'kibana.alert.workflow_status',
          'kibana.alert.rule.uuid',
          'kibana.alert.rule.producer',
          'kibana.alert.rule.consumer',
          'kibana.alert.rule.rule_type_id',
          'event.action',
          'kibana.alert.instance.id',
          'kibana.alert.rule.execution.uuid',
          'kibana.space_ids',
          'kibana.version',
          'event.kind',
          'kibana.alert.rule.parameters',
        ],
        false
      )
    ).toEqual([
      {
        cursor: {
          tiebreaker: null,
          value: '',
        },
        node: {
          _id: '3fef4a4c-3d96-4e79-b4e5-158a0461d577',
          _index: '.internal.alerts-observability.metrics.alerts-default-000001',
          data: [
            {
              field: 'kibana.alert.rule.consumer',
              value: ['infrastructure'],
            },
            {
              field: '@timestamp',
              value: ['2022-07-21T22:38:57.888Z'],
            },
            {
              field: 'kibana.alert.workflow_status',
              value: ['open'],
            },
            {
              field: 'kibana.alert.reason',
              value: [
                'CPU usage is 37.8% in the last 1 day for gke-edge-oblt-pool-1-9a60016d-7dvq. Alert when > 10%.',
              ],
            },
            {
              field: 'kibana.alert.rule.name',
              value: ['test 1212'],
            },
            {
              field: 'kibana.alert.rule.uuid',
              value: ['15d82f10-0926-11ed-bece-6b0c033d0075'],
            },
            {
              field: 'kibana.alert.rule.parameters.sourceId',
              value: ['default'],
            },
            {
              field: 'kibana.alert.rule.parameters.nodeType',
              value: ['host'],
            },
            {
              field: 'kibana.alert.rule.parameters.criteria.comparator',
              value: ['>'],
            },
            {
              field: 'kibana.alert.rule.parameters.criteria.timeSize',
              value: ['1'],
            },
            {
              field: 'kibana.alert.rule.parameters.criteria.metric',
              value: ['cpu'],
            },
            {
              field: 'kibana.alert.rule.parameters.criteria.threshold',
              value: ['10'],
            },
            {
              field: 'kibana.alert.rule.parameters.criteria.customMetric.aggregation',
              value: ['avg'],
            },
            {
              field: 'kibana.alert.rule.parameters.criteria.customMetric.id',
              value: ['alert-custom-metric'],
            },
            {
              field: 'kibana.alert.rule.parameters.criteria.customMetric.field',
              value: [''],
            },
            {
              field: 'kibana.alert.rule.parameters.criteria.customMetric.type',
              value: ['custom'],
            },
            {
              field: 'kibana.alert.rule.parameters.criteria.timeUnit',
              value: ['d'],
            },
            {
              field: 'event.action',
              value: ['active'],
            },
            {
              field: 'event.kind',
              value: ['signal'],
            },
            {
              field: 'kibana.alert.status',
              value: ['active'],
            },
            {
              field: 'kibana.alert.duration.us',
              value: ['9502040000'],
            },
            {
              field: 'kibana.alert.rule.category',
              value: ['Inventory'],
            },
            {
              field: 'kibana.alert.uuid',
              value: ['3fef4a4c-3d96-4e79-b4e5-158a0461d577'],
            },
            {
              field: 'kibana.alert.start',
              value: ['2022-07-21T20:00:35.848Z'],
            },
            {
              field: 'kibana.alert.rule.producer',
              value: ['infrastructure'],
            },
            {
              field: 'kibana.alert.rule.rule_type_id',
              value: ['metrics.alert.inventory.threshold'],
            },
            {
              field: 'kibana.alert.instance.id',
              value: ['gke-edge-oblt-pool-1-9a60016d-7dvq'],
            },
            {
              field: 'kibana.alert.rule.execution.uuid',
              value: ['37498c42-0190-4a83-adfa-c7e5f817f977'],
            },
            {
              field: 'kibana.space_ids',
              value: ['default'],
            },
            {
              field: 'kibana.version',
              value: ['8.4.0'],
            },
          ],
          ecs: {
            '@timestamp': ['2022-07-21T22:38:57.888Z'],
            _id: '3fef4a4c-3d96-4e79-b4e5-158a0461d577',
            _index: '.internal.alerts-observability.metrics.alerts-default-000001',
            event: {
              action: ['active'],
              kind: ['signal'],
            },
            kibana: {
              alert: {
                reason: [
                  'CPU usage is 37.8% in the last 1 day for gke-edge-oblt-pool-1-9a60016d-7dvq. Alert when > 10%.',
                ],
                rule: {
                  consumer: ['infrastructure'],
                  name: ['test 1212'],
                  uuid: ['15d82f10-0926-11ed-bece-6b0c033d0075'],
                  parameters: [
                    '{"sourceId":"default","nodeType":"host","criteria":[{"comparator":">","timeSize":1,"metric":"cpu","threshold":[10],"customMetric":{"aggregation":"avg","id":"alert-custom-metric","field":"","type":"custom"},"timeUnit":"d"}]}',
                  ],
                },
                workflow_status: ['open'],
              },
            },
            timestamp: '2022-07-21T22:38:57.888Z',
          },
        },
      },
    ]);
  });
});
