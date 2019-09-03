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
    test('Nginx Access', () => {
      const flattenedDocument = {
        '@timestamp': '2017-05-29T19:02:48.000Z',
        'ecs.version': '1.0.0-beta2',
        'event.dataset': 'nginx.access',
        'event.module': 'nginx',
        'fileset.name': 'access',
        'http.request.method': 'GET',
        'http.request.referrer': '-',
        'http.response.body.bytes': 612,
        'http.response.status_code': 404,
        'http.version': '1.1',
        'input.type': 'log',
        'log.offset': 183,
        'service.type': 'nginx',
        'source.ip': '172.17.0.1',
        'url.original': '/stringpatch',
        'user.name': '-',
        'user_agent.device': 'Other',
        'user_agent.major': '15',
        'user_agent.minor': '0',
        'user_agent.name': 'Firefox Alpha',
        'user_agent.original':
          'Mozilla/5.0 (Windows NT 6.1; rv:15.0) Gecko/20120716 Firefox/15.0a2',
        'user_agent.os.full_name': 'Windows 7',
        'user_agent.os.name': 'Windows 7',
        'user_agent.patch': 'a2',
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[",
  },
  Object {
    "field": "event.module",
    "highlights": Array [],
    "value": "nginx",
  },
  Object {
    "constant": "][access] ",
  },
  Object {
    "field": "source.ip",
    "highlights": Array [],
    "value": "172.17.0.1",
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
    "highlights": Array [],
    "value": "GET",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "url.original",
    "highlights": Array [],
    "value": "/stringpatch",
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
    "value": "612",
  },
]
`);
    });

    test('Nginx Error', () => {
      const flattenedDocument = {
        '@timestamp': '2016-10-25T14:49:34.000Z',
        'ecs.version': '1.0.0-beta2',
        'event.dataset': 'nginx.error',
        'event.module': 'nginx',
        'fileset.name': 'error',
        'input.type': 'log',
        'log.level': 'error',
        'log.offset': 0,
        message:
          'open() "/usr/local/Cellar/nginx/1.10.2_1/html/favicon.ico" failed (2: No such file or directory), client: 127.0.0.1, server: localhost, request: "GET /favicon.ico HTTP/1.1", host: "localhost:8080", referrer: "http://localhost:8080/"',
        'nginx.error.connection_id': 1,
        'process.pid': 54053,
        'process.thread.id': 0,
        'service.type': 'nginx',
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[nginx]",
  },
  Object {
    "constant": "[",
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
    "value": "open() \\"/usr/local/Cellar/nginx/1.10.2_1/html/favicon.ico\\" failed (2: No such file or directory), client: 127.0.0.1, server: localhost, request: \\"GET /favicon.ico HTTP/1.1\\", host: \\"localhost:8080\\", referrer: \\"http://localhost:8080/\\"",
  },
]
`);
    });
  });

  describe('in pre-ECS format', () => {
    test('Nginx Access', () => {
      const flattenedDocument = {
        'nginx.access': true,
        'nginx.access.remote_ip': '192.168.1.42',
        'nginx.access.user_name': 'admin',
        'nginx.access.method': 'GET',
        'nginx.access.url': '/faq',
        'nginx.access.http_version': '1.1',
        'nginx.access.body_sent.bytes': 1024,
        'nginx.access.response_code': 200,
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[nginx][access] ",
  },
  Object {
    "field": "nginx.access.remote_ip",
    "highlights": Array [],
    "value": "192.168.1.42",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "nginx.access.user_name",
    "highlights": Array [],
    "value": "admin",
  },
  Object {
    "constant": " \\"",
  },
  Object {
    "field": "nginx.access.method",
    "highlights": Array [],
    "value": "GET",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "nginx.access.url",
    "highlights": Array [],
    "value": "/faq",
  },
  Object {
    "constant": " HTTP/",
  },
  Object {
    "field": "nginx.access.http_version",
    "highlights": Array [],
    "value": "1.1",
  },
  Object {
    "constant": "\\" ",
  },
  Object {
    "field": "nginx.access.response_code",
    "highlights": Array [],
    "value": "200",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "nginx.access.body_sent.bytes",
    "highlights": Array [],
    "value": "1024",
  },
]
`);
    });

    test('Nginx Error', () => {
      const flattenedDocument = {
        'nginx.error.message':
          'connect() failed (111: Connection refused) while connecting to upstream, client: 127.0.0.1, server: localhost, request: "GET /php-status?json= HTTP/1.1", upstream: "fastcgi://[::1]:9000", host: "localhost"',
        'nginx.error.level': 'error',
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[nginx]",
  },
  Object {
    "constant": "[",
  },
  Object {
    "field": "nginx.error.level",
    "highlights": Array [],
    "value": "error",
  },
  Object {
    "constant": "] ",
  },
  Object {
    "field": "nginx.error.message",
    "highlights": Array [],
    "value": "connect() failed (111: Connection refused) while connecting to upstream, client: 127.0.0.1, server: localhost, request: \\"GET /php-status?json= HTTP/1.1\\", upstream: \\"fastcgi://[::1]:9000\\", host: \\"localhost\\"",
  },
]
`);
    });
  });
});
