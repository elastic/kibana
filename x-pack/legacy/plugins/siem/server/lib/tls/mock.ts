/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Direction, TlsFields, FlowTargetSourceDest } from '../../graphql/types';

export const mockTlsQuery = {
  allowNoIndices: true,
  index: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
  ignoreUnavailable: true,
  body: {
    aggs: {
      count: { cardinality: { field: 'tls.server_certificate.fingerprint.sha1' } },
      sha1: {
        terms: {
          field: 'tls.server_certificate.fingerprint.sha1',
          size: 10,
          order: { _key: 'desc' },
        },
        aggs: {
          issuer_names: { terms: { field: 'tls.server_certificate.issuer.common_name' } },
          common_names: { terms: { field: 'tls.server_certificate.subject.common_name' } },
          alternative_names: { terms: { field: 'tls.server_certificate.alternative_names' } },
          not_after: { terms: { field: 'tls.server_certificate.not_after' } },
          ja3: { terms: { field: 'tls.fingerprints.ja3.hash' } },
        },
      },
    },
    query: {
      bool: { filter: [{ range: { '@timestamp': { gte: 1570719927430, lte: 1570806327431 } } }] },
    },
    size: 0,
    track_total_hits: false,
  },
};

export const expectedTlsEdges = [
  {
    cursor: {
      tiebreaker: null,
      value: 'fff8dc95436e0e25ce46b1526a1a547e8cf3bb82',
    },
    node: {
      _id: 'fff8dc95436e0e25ce46b1526a1a547e8cf3bb82',
      alternativeNames: [
        '*.1.nflxso.net',
        '*.a.nflxso.net',
        'assets.nflxext.com',
        'cast.netflix.com',
        'codex.nflxext.com',
        'tvui.netflix.com',
      ],
      commonNames: ['*.1.nflxso.net'],
      issuerNames: ['DigiCert SHA2 Secure Server CA'],
      ja3: ['95d2dd53a89b334cddd5c22e81e7fe61'],
      notAfter: ['2019-10-27T12:00:00.000Z'],
    },
  },
  {
    cursor: {
      tiebreaker: null,
      value: 'fd8440c4b20978b173e0910e2639d114f0d405c5',
    },
    node: {
      _id: 'fd8440c4b20978b173e0910e2639d114f0d405c5',
      alternativeNames: ['*.cogocast.net', 'cogocast.net'],
      commonNames: ['cogocast.net'],
      issuerNames: ['Amazon'],
      ja3: ['a111d93cdf31f993c40a8a9ef13e8d7e'],
      notAfter: ['2020-02-01T12:00:00.000Z'],
    },
  },
  {
    cursor: { tiebreaker: null, value: 'fcdc16645ebb3386adc96e7ba735c4745709b9dd' },
    node: {
      _id: 'fcdc16645ebb3386adc96e7ba735c4745709b9dd',
      alternativeNames: [
        'player-devintever2-imperva.mountain.siriusxm.com',
        'player-devintever2.mountain.siriusxm.com',
      ],
      commonNames: ['player-devintever2.mountain.siriusxm.com'],
      issuerNames: ['Trustwave Organization Validation SHA256 CA, Level 1'],
      ja3: ['6fa3244afc6bb6f9fad207b6b52af26b'],
      notAfter: ['2020-03-06T21:57:09.000Z'],
    },
  },
  {
    cursor: { tiebreaker: null, value: 'fccf375789cb7e671502a7b0cc969f218a4b2c70' },
    node: {
      _id: 'fccf375789cb7e671502a7b0cc969f218a4b2c70',
      alternativeNames: [
        'appleid-nc-s.apple.com',
        'appleid-nwk-s.apple.com',
        'appleid-prn-s.apple.com',
        'appleid-rno-s.apple.com',
        'appleid.apple.com',
      ],
      commonNames: ['appleid.apple.com'],
      issuerNames: ['DigiCert SHA2 Extended Validation Server CA'],
      ja3: ['6fa3244afc6bb6f9fad207b6b52af26b'],
      notAfter: ['2020-07-04T12:00:00.000Z'],
    },
  },
  {
    cursor: { tiebreaker: null, value: 'fc4a296b706fa18ac50b96f5c0327c69db4a8981' },
    node: {
      _id: 'fc4a296b706fa18ac50b96f5c0327c69db4a8981',
      alternativeNames: [
        'api.itunes.apple.com',
        'appsto.re',
        'ax.init.itunes.apple.com',
        'bag.itunes.apple.com',
        'bookkeeper.itunes.apple.com',
        'c.itunes.apple.com',
        'carrierbundle.itunes.apple.com',
        'client-api.itunes.apple.com',
        'cma.itunes.apple.com',
        'courses.apple.com',
      ],
      commonNames: ['itunes.apple.com'],
      issuerNames: ['DigiCert SHA2 Extended Validation Server CA'],
      ja3: ['a441a33aaee795f498d6b764cc78989a'],
      notAfter: ['2020-03-24T12:00:00.000Z'],
    },
  },
  {
    cursor: { tiebreaker: null, value: 'fc2cbc41f6a0e9c0118de4fe40f299f7207b797e' },
    node: {
      _id: 'fc2cbc41f6a0e9c0118de4fe40f299f7207b797e',
      alternativeNames: [
        '*.adlercasino.com',
        '*.allaustraliancasino.com',
        '*.alletf.com',
        '*.appareldesignpartners.com',
        '*.atmosfir.net',
        '*.cityofboston.gov',
        '*.cp.mytoyotaentune.com',
        '*.decathlon.be',
        '*.decathlon.co.uk',
        '*.decathlon.de',
      ],
      commonNames: ['incapsula.com'],
      issuerNames: ['GlobalSign CloudSSL CA - SHA256 - G3'],
      ja3: ['6fa3244afc6bb6f9fad207b6b52af26b'],
      notAfter: ['2020-04-04T14:05:06.000Z'],
    },
  },
  {
    cursor: { tiebreaker: null, value: 'fb70d78ffa663a3a4374d841b3288d2de9759566' },
    node: {
      _id: 'fb70d78ffa663a3a4374d841b3288d2de9759566',
      alternativeNames: ['*.siriusxm.com', 'siriusxm.com'],
      commonNames: ['*.siriusxm.com'],
      issuerNames: ['DigiCert Baltimore CA-2 G2'],
      ja3: ['535aca3d99fc247509cd50933cd71d37', '6fa3244afc6bb6f9fad207b6b52af26b'],
      notAfter: ['2021-10-27T12:00:00.000Z'],
    },
  },
  {
    cursor: { tiebreaker: null, value: 'fb59038dcec33ab3a01a6ae60d0835ad0e04ccf0' },
    node: {
      _id: 'fb59038dcec33ab3a01a6ae60d0835ad0e04ccf0',
      alternativeNames: [
        'photos.amazon.co.uk',
        'photos.amazon.de',
        'photos.amazon.es',
        'photos.amazon.eu',
        'photos.amazon.fr',
        'photos.amazon.it',
      ],
      commonNames: ['photos.amazon.eu'],
      issuerNames: ['Amazon'],
      ja3: ['6fa3244afc6bb6f9fad207b6b52af26b'],
      notAfter: ['2020-04-23T12:00:00.000Z'],
    },
  },
  {
    cursor: { tiebreaker: null, value: 'f9815293c883a6006f0b2d95a4895bdc501fd174' },
    node: {
      _id: 'f9815293c883a6006f0b2d95a4895bdc501fd174',
      alternativeNames: [
        '*.api.cdn.hbo.com',
        '*.artist.cdn.hbo.com',
        '*.cdn.hbo.com',
        '*.lv3.cdn.hbo.com',
        'artist.api.cdn.hbo.com',
        'artist.api.lv3.cdn.hbo.com',
        'artist.staging.cdn.hbo.com',
        'artist.staging.hurley.lv3.cdn.hbo.com',
        'atv.api.lv3.cdn.hbo.com',
        'atv.staging.hurley.lv3.cdn.hbo.com',
      ],
      commonNames: ['cdn.hbo.com'],
      issuerNames: ['Sectigo RSA Organization Validation Secure Server CA'],
      ja3: ['6fa3244afc6bb6f9fad207b6b52af26b'],
      notAfter: ['2021-02-10T23:59:59.000Z'],
    },
  },
  {
    cursor: { tiebreaker: null, value: 'f8db6a69797e383dca2529727369595733123386' },
    node: {
      _id: 'f8db6a69797e383dca2529727369595733123386',
      alternativeNames: ['www.google.com'],
      commonNames: ['www.google.com'],
      issuerNames: ['GTS CA 1O1'],
      ja3: ['a111d93cdf31f993c40a8a9ef13e8d7e'],
      notAfter: ['2019-12-10T13:32:54.000Z'],
    },
  },
];

export const mockRequest = {
  params: {},
  payload: {
    operationName: 'GetTlsQuery',
    variables: {
      defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
      filterQuery: '',
      flowTarget: 'source',
      inspect: false,
      ip: '',
      pagination: { activePage: 0, cursorStart: 0, fakePossibleCount: 50, querySize: 10 },
      sort: { field: '_id', direction: 'desc' },
      sourceId: 'default',
      timerange: { interval: '12h', from: 1570716261267, to: 1570802661267 },
    },
    query:
      'query GetTlsQuery($sourceId: ID!, $filterQuery: String, $flowTarget: FlowTarget!, $ip: String!, $pagination: PaginationInputPaginated!, $sort: TlsSortField!, $timerange: TimerangeInput!, $defaultIndex: [String!]!, $inspect: Boolean!) {\n  source(id: $sourceId) {\n    id\n    Tls(filterQuery: $filterQuery, flowTarget: $flowTarget, ip: $ip, pagination: $pagination, sort: $sort, timerange: $timerange, defaultIndex: $defaultIndex) {\n      totalCount\n      edges {\n        node {\n          _id\n          alternativeNames\n          commonNames\n          ja3\n          issuerNames\n          notAfter\n          __typename\n        }\n        cursor {\n          value\n          __typename\n        }\n        __typename\n      }\n      pageInfo {\n        activePage\n        fakeTotalCount\n        showMorePagesIndicator\n        __typename\n      }\n      inspect @include(if: $inspect) {\n        dsl\n        response\n        __typename\n      }\n      __typename\n    }\n    __typename\n  }\n}\n',
  },
  query: {},
};

export const mockResponse = {
  took: 92,
  timed_out: false,
  _shards: { total: 33, successful: 33, skipped: 0, failed: 0 },
  hits: { max_score: null, hits: [] },
  aggregations: {
    sha1: {
      doc_count_error_upper_bound: 0,
      sum_other_doc_count: 4597,
      buckets: [
        {
          key: 'fff8dc95436e0e25ce46b1526a1a547e8cf3bb82',
          doc_count: 1,
          not_after: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 1572177600000, key_as_string: '2019-10-27T12:00:00.000Z', doc_count: 1 },
            ],
          },
          issuer_names: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'DigiCert SHA2 Secure Server CA', doc_count: 1 }],
          },
          common_names: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: '*.1.nflxso.net', doc_count: 1 }],
          },
          alternative_names: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: '*.1.nflxso.net', doc_count: 1 },
              { key: '*.a.nflxso.net', doc_count: 1 },
              { key: 'assets.nflxext.com', doc_count: 1 },
              { key: 'cast.netflix.com', doc_count: 1 },
              { key: 'codex.nflxext.com', doc_count: 1 },
              { key: 'tvui.netflix.com', doc_count: 1 },
            ],
          },
          ja3: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: '95d2dd53a89b334cddd5c22e81e7fe61', doc_count: 1 }],
          },
        },
        {
          key: 'fd8440c4b20978b173e0910e2639d114f0d405c5',
          doc_count: 1,
          not_after: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 1580558400000, key_as_string: '2020-02-01T12:00:00.000Z', doc_count: 1 },
            ],
          },
          issuer_names: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'Amazon', doc_count: 1 }],
          },
          common_names: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'cogocast.net', doc_count: 1 }],
          },
          alternative_names: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: '*.cogocast.net', doc_count: 1 },
              { key: 'cogocast.net', doc_count: 1 },
            ],
          },
          ja3: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'a111d93cdf31f993c40a8a9ef13e8d7e', doc_count: 1 }],
          },
        },
        {
          key: 'fcdc16645ebb3386adc96e7ba735c4745709b9dd',
          doc_count: 1,
          not_after: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 1583531829000, key_as_string: '2020-03-06T21:57:09.000Z', doc_count: 1 },
            ],
          },
          issuer_names: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 'Trustwave Organization Validation SHA256 CA, Level 1', doc_count: 1 },
            ],
          },
          common_names: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'player-devintever2.mountain.siriusxm.com', doc_count: 1 }],
          },
          alternative_names: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 'player-devintever2-imperva.mountain.siriusxm.com', doc_count: 1 },
              { key: 'player-devintever2.mountain.siriusxm.com', doc_count: 1 },
            ],
          },
          ja3: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: '6fa3244afc6bb6f9fad207b6b52af26b', doc_count: 1 }],
          },
        },
        {
          key: 'fccf375789cb7e671502a7b0cc969f218a4b2c70',
          doc_count: 1,
          not_after: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 1593864000000, key_as_string: '2020-07-04T12:00:00.000Z', doc_count: 1 },
            ],
          },
          issuer_names: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'DigiCert SHA2 Extended Validation Server CA', doc_count: 1 }],
          },
          common_names: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'appleid.apple.com', doc_count: 1 }],
          },
          alternative_names: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 'appleid-nc-s.apple.com', doc_count: 1 },
              { key: 'appleid-nwk-s.apple.com', doc_count: 1 },
              { key: 'appleid-prn-s.apple.com', doc_count: 1 },
              { key: 'appleid-rno-s.apple.com', doc_count: 1 },
              { key: 'appleid.apple.com', doc_count: 1 },
            ],
          },
          ja3: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: '6fa3244afc6bb6f9fad207b6b52af26b', doc_count: 1 }],
          },
        },
        {
          key: 'fc4a296b706fa18ac50b96f5c0327c69db4a8981',
          doc_count: 2,
          not_after: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 1585051200000, key_as_string: '2020-03-24T12:00:00.000Z', doc_count: 2 },
            ],
          },
          issuer_names: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'DigiCert SHA2 Extended Validation Server CA', doc_count: 2 }],
          },
          common_names: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'itunes.apple.com', doc_count: 2 }],
          },
          alternative_names: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 156,
            buckets: [
              { key: 'api.itunes.apple.com', doc_count: 2 },
              { key: 'appsto.re', doc_count: 2 },
              { key: 'ax.init.itunes.apple.com', doc_count: 2 },
              { key: 'bag.itunes.apple.com', doc_count: 2 },
              { key: 'bookkeeper.itunes.apple.com', doc_count: 2 },
              { key: 'c.itunes.apple.com', doc_count: 2 },
              { key: 'carrierbundle.itunes.apple.com', doc_count: 2 },
              { key: 'client-api.itunes.apple.com', doc_count: 2 },
              { key: 'cma.itunes.apple.com', doc_count: 2 },
              { key: 'courses.apple.com', doc_count: 2 },
            ],
          },
          ja3: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'a441a33aaee795f498d6b764cc78989a', doc_count: 2 }],
          },
        },
        {
          key: 'fc2cbc41f6a0e9c0118de4fe40f299f7207b797e',
          doc_count: 1,
          not_after: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 1586009106000, key_as_string: '2020-04-04T14:05:06.000Z', doc_count: 1 },
            ],
          },
          issuer_names: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'GlobalSign CloudSSL CA - SHA256 - G3', doc_count: 1 }],
          },
          common_names: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'incapsula.com', doc_count: 1 }],
          },
          alternative_names: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 110,
            buckets: [
              { key: '*.adlercasino.com', doc_count: 1 },
              { key: '*.allaustraliancasino.com', doc_count: 1 },
              { key: '*.alletf.com', doc_count: 1 },
              { key: '*.appareldesignpartners.com', doc_count: 1 },
              { key: '*.atmosfir.net', doc_count: 1 },
              { key: '*.cityofboston.gov', doc_count: 1 },
              { key: '*.cp.mytoyotaentune.com', doc_count: 1 },
              { key: '*.decathlon.be', doc_count: 1 },
              { key: '*.decathlon.co.uk', doc_count: 1 },
              { key: '*.decathlon.de', doc_count: 1 },
            ],
          },
          ja3: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: '6fa3244afc6bb6f9fad207b6b52af26b', doc_count: 1 }],
          },
        },
        {
          key: 'fb70d78ffa663a3a4374d841b3288d2de9759566',
          doc_count: 325,
          not_after: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 1635336000000, key_as_string: '2021-10-27T12:00:00.000Z', doc_count: 325 },
            ],
          },
          issuer_names: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'DigiCert Baltimore CA-2 G2', doc_count: 325 }],
          },
          common_names: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: '*.siriusxm.com', doc_count: 325 }],
          },
          alternative_names: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: '*.siriusxm.com', doc_count: 325 },
              { key: 'siriusxm.com', doc_count: 325 },
            ],
          },
          ja3: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: '535aca3d99fc247509cd50933cd71d37', doc_count: 284 },
              { key: '6fa3244afc6bb6f9fad207b6b52af26b', doc_count: 39 },
            ],
          },
        },
        {
          key: 'fb59038dcec33ab3a01a6ae60d0835ad0e04ccf0',
          doc_count: 5,
          not_after: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 1587643200000, key_as_string: '2020-04-23T12:00:00.000Z', doc_count: 5 },
            ],
          },
          issuer_names: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'Amazon', doc_count: 5 }],
          },
          common_names: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'photos.amazon.eu', doc_count: 5 }],
          },
          alternative_names: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 'photos.amazon.co.uk', doc_count: 5 },
              { key: 'photos.amazon.de', doc_count: 5 },
              { key: 'photos.amazon.es', doc_count: 5 },
              { key: 'photos.amazon.eu', doc_count: 5 },
              { key: 'photos.amazon.fr', doc_count: 5 },
              { key: 'photos.amazon.it', doc_count: 5 },
            ],
          },
          ja3: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: '6fa3244afc6bb6f9fad207b6b52af26b', doc_count: 5 }],
          },
        },
        {
          key: 'f9815293c883a6006f0b2d95a4895bdc501fd174',
          doc_count: 29,
          not_after: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 1613001599000, key_as_string: '2021-02-10T23:59:59.000Z', doc_count: 29 },
            ],
          },
          issuer_names: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 'Sectigo RSA Organization Validation Secure Server CA', doc_count: 29 },
            ],
          },
          common_names: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'cdn.hbo.com', doc_count: 29 }],
          },
          alternative_names: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 29,
            buckets: [
              { key: '*.api.cdn.hbo.com', doc_count: 29 },
              { key: '*.artist.cdn.hbo.com', doc_count: 29 },
              { key: '*.cdn.hbo.com', doc_count: 29 },
              { key: '*.lv3.cdn.hbo.com', doc_count: 29 },
              { key: 'artist.api.cdn.hbo.com', doc_count: 29 },
              { key: 'artist.api.lv3.cdn.hbo.com', doc_count: 29 },
              { key: 'artist.staging.cdn.hbo.com', doc_count: 29 },
              { key: 'artist.staging.hurley.lv3.cdn.hbo.com', doc_count: 29 },
              { key: 'atv.api.lv3.cdn.hbo.com', doc_count: 29 },
              { key: 'atv.staging.hurley.lv3.cdn.hbo.com', doc_count: 29 },
            ],
          },
          ja3: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: '6fa3244afc6bb6f9fad207b6b52af26b', doc_count: 26 }],
          },
        },
        {
          key: 'f8db6a69797e383dca2529727369595733123386',
          doc_count: 5,
          not_after: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 1575984774000, key_as_string: '2019-12-10T13:32:54.000Z', doc_count: 5 },
            ],
          },
          issuer_names: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'GTS CA 1O1', doc_count: 5 }],
          },
          common_names: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'www.google.com', doc_count: 5 }],
          },
          alternative_names: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'www.google.com', doc_count: 5 }],
          },
          ja3: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'a111d93cdf31f993c40a8a9ef13e8d7e', doc_count: 5 }],
          },
        },
      ],
    },
    count: { value: 364 },
  },
};

export const mockOptions = {
  defaultIndex: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
  sourceConfiguration: {
    fields: {
      container: 'docker.container.name',
      host: 'beat.hostname',
      message: ['message', '@message'],
      pod: 'kubernetes.pod.name',
      tiebreaker: '_doc',
      timestamp: '@timestamp',
    },
  },
  timerange: { interval: '12h', to: 1570801871626, from: 1570715471626 },
  pagination: { activePage: 0, cursorStart: 0, fakePossibleCount: 50, querySize: 10 },
  filterQuery: {},
  fields: [
    'totalCount',
    '_id',
    'alternativeNames',
    'commonNames',
    'ja3',
    'issuerNames',
    'notAfter',
    'edges.cursor.value',
    'pageInfo.activePage',
    'pageInfo.fakeTotalCount',
    'pageInfo.showMorePagesIndicator',
    'inspect.dsl',
    'inspect.response',
  ],
  ip: '',
  sort: { field: TlsFields._id, direction: Direction.desc },
  flowTarget: FlowTargetSourceDest.source,
};
