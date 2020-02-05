/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getBuiltinRules } from '.';
import { compileFormattingRules } from '../message';

const { format } = compileFormattingRules(getBuiltinRules([]));

describe('Filebeat Rules', () => {
  describe('in ECS format', () => {
    test('mysql error log', () => {
      const flattenedDocument = {
        '@timestamp': '2016-12-09T12:08:33.335Z',
        'ecs.version': '1.0.0-beta2',
        'event.dataset': 'mysql.error',
        'event.module': 'mysql',
        'fileset.name': 'error',
        'input.type': 'log',
        'log.level': 'Warning',
        'log.offset': 92,
        message:
          'TIMESTAMP with implicit DEFAULT value is deprecated. Please use --explicit_defaults_for_timestamp server option (see documentation for more details).',
        'mysql.thread_id': 0,
        'service.type': 'mysql',
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[",
  },
  Object {
    "field": "event.dataset",
    "highlights": Array [],
    "value": "mysql.error",
  },
  Object {
    "constant": "][",
  },
  Object {
    "field": "log.level",
    "highlights": Array [],
    "value": "Warning",
  },
  Object {
    "constant": "] ",
  },
  Object {
    "field": "message",
    "highlights": Array [],
    "value": "TIMESTAMP with implicit DEFAULT value is deprecated. Please use --explicit_defaults_for_timestamp server option (see documentation for more details).",
  },
]
`);
    });

    test('mysql slowlog', () => {
      const flattenedDocument = {
        '@timestamp': '2018-08-07T08:27:47.000Z',
        'ecs.version': '1.0.0-beta2',
        'event.dataset': 'mysql.slowlog',
        'event.duration': 4071491000,
        'event.module': 'mysql',
        'fileset.name': 'slowlog',
        'input.type': 'log',
        'log.flags': ['multiline'],
        'log.offset': 526,
        'mysql.slowlog.current_user': 'appuser',
        'mysql.slowlog.lock_time.sec': 0.000212,
        'mysql.slowlog.query':
          'SELECT mcu.mcu_guid, mcu.cus_guid, mcu.mcu_url, mcu.mcu_crawlelements, mcu.mcu_order, GROUP_CONCAT(mca.mca_guid SEPARATOR ";") as mca_guid\n                    FROM kat_mailcustomerurl mcu, kat_customer cus, kat_mailcampaign mca\n                    WHERE cus.cus_guid = mcu.cus_guid\n                        AND cus.pro_code = \'CYB\'\n                        AND cus.cus_offline = 0\n                        AND mca.cus_guid = cus.cus_guid\n                        AND (mcu.mcu_date IS NULL OR mcu.mcu_date < CURDATE())\n                        AND mcu.mcu_crawlelements IS NOT NULL\n                    GROUP BY mcu.mcu_guid\n                    ORDER BY mcu.mcu_order ASC\n                    LIMIT 1000;',
        'mysql.slowlog.rows_examined': 1489615,
        'mysql.slowlog.rows_sent': 1000,
        'mysql.thread_id': 10997316,
        'service.type': 'mysql',
        'source.domain': 'apphost',
        'source.ip': '1.1.1.1',
        'user.name': 'appuser',
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[MySQL][slowlog] ",
  },
  Object {
    "field": "user.name",
    "highlights": Array [],
    "value": "appuser",
  },
  Object {
    "constant": "@",
  },
  Object {
    "field": "source.domain",
    "highlights": Array [],
    "value": "apphost",
  },
  Object {
    "constant": " [",
  },
  Object {
    "field": "source.ip",
    "highlights": Array [],
    "value": "1.1.1.1",
  },
  Object {
    "constant": "] ",
  },
  Object {
    "constant": " - ",
  },
  Object {
    "field": "event.duration",
    "highlights": Array [],
    "value": "4071491000",
  },
  Object {
    "constant": " ns - ",
  },
  Object {
    "field": "mysql.slowlog.query",
    "highlights": Array [],
    "value": "SELECT mcu.mcu_guid, mcu.cus_guid, mcu.mcu_url, mcu.mcu_crawlelements, mcu.mcu_order, GROUP_CONCAT(mca.mca_guid SEPARATOR \\";\\") as mca_guid
                    FROM kat_mailcustomerurl mcu, kat_customer cus, kat_mailcampaign mca
                    WHERE cus.cus_guid = mcu.cus_guid
                        AND cus.pro_code = 'CYB'
                        AND cus.cus_offline = 0
                        AND mca.cus_guid = cus.cus_guid
                        AND (mcu.mcu_date IS NULL OR mcu.mcu_date < CURDATE())
                        AND mcu.mcu_crawlelements IS NOT NULL
                    GROUP BY mcu.mcu_guid
                    ORDER BY mcu.mcu_order ASC
                    LIMIT 1000;",
  },
]
`);
    });
  });

  describe('in pre-ECS format', () => {
    test('mysql error log', () => {
      const errorDoc = {
        'mysql.error.message':
          "Access denied for user 'petclinicdd'@'47.153.152.234' (using password: YES)",
      };
      const message = format(errorDoc, {});
      expect(message).toEqual([
        {
          constant: '[MySQL][error] ',
        },
        {
          field: 'mysql.error.message',
          highlights: [],
          value: "Access denied for user 'petclinicdd'@'47.153.152.234' (using password: YES)",
        },
      ]);
    });

    test('mysql slow log', () => {
      const errorDoc = {
        'mysql.slowlog.query': 'select * from hosts',
        'mysql.slowlog.query_time.sec': 5,
        'mysql.slowlog.user': 'admin',
        'mysql.slowlog.ip': '192.168.1.42',
        'mysql.slowlog.host': 'webserver-01',
      };
      const message = format(errorDoc, {});
      expect(message).toEqual([
        {
          constant: '[MySQL][slowlog] ',
        },
        {
          field: 'mysql.slowlog.user',
          highlights: [],
          value: 'admin',
        },
        {
          constant: '@',
        },
        {
          field: 'mysql.slowlog.host',
          highlights: [],
          value: 'webserver-01',
        },
        {
          constant: ' [',
        },
        {
          field: 'mysql.slowlog.ip',
          highlights: [],
          value: '192.168.1.42',
        },
        {
          constant: '] ',
        },
        {
          constant: ' - ',
        },
        {
          field: 'mysql.slowlog.query_time.sec',
          highlights: [],
          value: '5',
        },
        {
          constant: ' s - ',
        },
        {
          field: 'mysql.slowlog.query',
          highlights: [],
          value: 'select * from hosts',
        },
      ]);
    });
  });
});
