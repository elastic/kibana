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
    test('Apache2 Access', () => {
      const flattenedDocument = {
        '@timestamp': '2016-12-26T16:22:13.000Z',
        'ecs.version': '1.0.0-beta2',
        'event.dataset': 'apache.access',
        'event.module': 'apache',
        'fileset.name': 'access',
        'http.request.method': 'GET',
        'http.request.referrer': '-',
        'http.response.body.bytes': 499,
        'http.response.status_code': 404,
        'http.version': '1.1',
        'input.type': 'log',
        'log.offset': 73,
        'service.type': 'apache',
        'source.address': '192.168.33.1',
        'source.ip': '192.168.33.1',
        'url.original': '/hello',
        'user.name': '-',
        'user_agent.device': 'Other',
        'user_agent.major': '50',
        'user_agent.minor': '0',
        'user_agent.name': 'Firefox',
        'user_agent.original':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv:50.0) Gecko/20100101 Firefox/50.0',
        'user_agent.os.full_name': 'Mac OS X 10.12',
        'user_agent.os.major': '10',
        'user_agent.os.minor': '12',
        'user_agent.os.name': 'Mac OS X',
      };
      const highlights = {
        'http.request.method': ['GET'],
      };

      expect(format(flattenedDocument, highlights)).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[",
  },
  Object {
    "field": "event.module",
    "highlights": Array [],
    "value": "apache",
  },
  Object {
    "constant": "][access] ",
  },
  Object {
    "field": "source.ip",
    "highlights": Array [],
    "value": "192.168.33.1",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "user.name",
    "highlights": Array [],
    "value": "-",
  },
  Object {
    "constant": " \\"",
  },
  Object {
    "field": "http.request.method",
    "highlights": Array [
      "GET",
    ],
    "value": "GET",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "url.original",
    "highlights": Array [],
    "value": "/hello",
  },
  Object {
    "constant": " HTTP/",
  },
  Object {
    "field": "http.version",
    "highlights": Array [],
    "value": "1.1",
  },
  Object {
    "constant": "\\" ",
  },
  Object {
    "field": "http.response.status_code",
    "highlights": Array [],
    "value": "404",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "http.response.body.bytes",
    "highlights": Array [],
    "value": "499",
  },
]
`);
    });

    test('Apache2 Error', () => {
      const flattenedDocument = {
        '@timestamp': '2016-12-26T16:22:08.000Z',
        'ecs.version': '1.0.0-beta2',
        'event.dataset': 'apache.error',
        'event.module': 'apache',
        'fileset.name': 'error',
        'input.type': 'log',
        'log.level': 'error',
        'log.offset': 0,
        message: 'File does not exist: /var/www/favicon.ico',
        'service.type': 'apache',
        'source.address': '192.168.33.1',
        'source.ip': '192.168.33.1',
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[apache][",
  },
  Object {
    "field": "log.level",
    "highlights": Array [],
    "value": "error",
  },
  Object {
    "constant": "] ",
  },
  Object {
    "field": "message",
    "highlights": Array [],
    "value": "File does not exist: /var/www/favicon.ico",
  },
]
`);
    });
  });

  describe('in pre-ECS format', () => {
    test('Apache2 Access', () => {
      const flattenedDocument = {
        'apache2.access': true,
        'apache2.access.remote_ip': '192.168.1.42',
        'apache2.access.user_name': 'admin',
        'apache2.access.method': 'GET',
        'apache2.access.url': '/faqs',
        'apache2.access.http_version': '1.1',
        'apache2.access.response_code': '200',
        'apache2.access.body_sent.bytes': 1024,
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[apache][access] ",
  },
  Object {
    "field": "apache2.access.remote_ip",
    "highlights": Array [],
    "value": "192.168.1.42",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "apache2.access.user_name",
    "highlights": Array [],
    "value": "admin",
  },
  Object {
    "constant": " \\"",
  },
  Object {
    "field": "apache2.access.method",
    "highlights": Array [],
    "value": "GET",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "apache2.access.url",
    "highlights": Array [],
    "value": "/faqs",
  },
  Object {
    "constant": " HTTP/",
  },
  Object {
    "field": "apache2.access.http_version",
    "highlights": Array [],
    "value": "1.1",
  },
  Object {
    "constant": "\\" ",
  },
  Object {
    "field": "apache2.access.response_code",
    "highlights": Array [],
    "value": "200",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "apache2.access.body_sent.bytes",
    "highlights": Array [],
    "value": "1024",
  },
]
`);
    });

    test('Apache2 Error', () => {
      const flattenedDocument = {
        'apache2.error.message':
          'AH00489: Apache/2.4.18 (Ubuntu) configured -- resuming normal operations',
        'apache2.error.level': 'notice',
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[apache][",
  },
  Object {
    "field": "apache2.error.level",
    "highlights": Array [],
    "value": "notice",
  },
  Object {
    "constant": "] ",
  },
  Object {
    "field": "apache2.error.message",
    "highlights": Array [],
    "value": "AH00489: Apache/2.4.18 (Ubuntu) configured -- resuming normal operations",
  },
]
`);
    });
  });
});
