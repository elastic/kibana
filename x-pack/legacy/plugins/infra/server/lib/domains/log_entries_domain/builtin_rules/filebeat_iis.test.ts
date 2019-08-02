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
    test('iis access log', () => {
      const flattenedDocument = {
        '@timestamp': '2018-01-01T10:11:12.000Z',
        'destination.address': '127.0.0.1',
        'destination.domain': 'example.com',
        'destination.ip': '127.0.0.1',
        'destination.port': 80,
        'ecs.version': '1.0.0-beta2',
        'event.dataset': 'iis.access',
        'event.duration': 789000000,
        'event.module': 'iis',
        'fileset.name': 'access',
        'http.request.body.bytes': 456,
        'http.request.method': 'GET',
        'http.request.referrer': '-',
        'http.response.body.bytes': 123,
        'http.response.status_code': 200,
        'http.version': '1.1',
        'iis.access.cookie': '-',
        'iis.access.server_name': 'MACHINE-NAME',
        'iis.access.site_name': 'W3SVC1',
        'iis.access.sub_status': 0,
        'iis.access.win32_status': 0,
        'input.type': 'log',
        'log.offset': 1204,
        'service.type': 'iis',
        'source.address': '85.181.35.98',
        'source.geo.city_name': 'Berlin',
        'source.geo.continent_name': 'Europe',
        'source.geo.country_iso_code': 'DE',
        'source.geo.location.lat': 52.4908,
        'source.geo.location.lon': 13.3275,
        'source.geo.region_iso_code': 'DE-BE',
        'source.geo.region_name': 'Land Berlin',
        'source.ip': '85.181.35.98',
        'url.path': '/',
        'url.query': 'q=100',
        'user.name': '-',
        'user_agent.device.name': 'Other',
        'user_agent.name': 'Chrome',
        'user_agent.original':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.102 Safari/537.36',
        'user_agent.os.full': 'Mac OS X 10.14.0',
        'user_agent.os.name': 'Mac OS X',
        'user_agent.os.version': '10.14.0',
        'user_agent.version': '70.0.3538',
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[",
  },
  Object {
    "field": "event.module",
    "highlights": Array [],
    "value": "iis",
  },
  Object {
    "constant": "][access] ",
  },
  Object {
    "field": "source.ip",
    "highlights": Array [],
    "value": "85.181.35.98",
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
    "field": "url.path",
    "highlights": Array [],
    "value": "/",
  },
  Object {
    "constant": "?",
  },
  Object {
    "field": "url.query",
    "highlights": Array [],
    "value": "q=100",
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
    "value": "200",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "http.response.body.bytes",
    "highlights": Array [],
    "value": "123",
  },
]
`);
    });

    test('iis 7.5 access log', () => {
      const flattenedDocument = {
        '@timestamp': '2018-08-28T18:24:25.000Z',
        'destination.address': '10.100.220.70',
        'destination.ip': '10.100.220.70',
        'destination.port': 80,
        'ecs.version': '1.0.0-beta2',
        'event.dataset': 'iis.access',
        'event.duration': 792000000,
        'event.module': 'iis',
        'fileset.name': 'access',
        'http.request.method': 'GET',
        'http.response.status_code': 404,
        'iis.access.sub_status': 4,
        'iis.access.win32_status': 2,
        'input.type': 'log',
        'log.offset': 244,
        'service.type': 'iis',
        'source.address': '10.100.118.31',
        'source.ip': '10.100.118.31',
        'url.path': '/',
        'url.query': 'q=100',
        'user.name': '-',
        'user_agent.device.name': 'Other',
        'user_agent.name': 'IE',
        'user_agent.original':
          'Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 6.3; WOW64; Trident/7.0; .NET4.0E; .NET4.0C; .NET CLR 3.5.30729; .NET CLR[ 2.0.50727](tel: 2050727); .NET CLR 3.0.30729)',
        'user_agent.os.name': 'Windows 8.1',
        'user_agent.version': '7.0',
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[",
  },
  Object {
    "field": "event.module",
    "highlights": Array [],
    "value": "iis",
  },
  Object {
    "constant": "][access] ",
  },
  Object {
    "field": "source.ip",
    "highlights": Array [],
    "value": "10.100.118.31",
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
    "field": "url.path",
    "highlights": Array [],
    "value": "/",
  },
  Object {
    "constant": "?",
  },
  Object {
    "field": "url.query",
    "highlights": Array [],
    "value": "q=100",
  },
  Object {
    "constant": " HTTP/",
  },
  Object {
    "field": "http.version",
    "highlights": Array [],
    "value": "undefined",
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
    "value": "undefined",
  },
]
`);
    });

    test('iis error log', () => {
      const flattenedDocument = {
        '@timestamp': '2018-01-01T08:09:10.000Z',
        'destination.address': '172.31.77.6',
        'destination.ip': '172.31.77.6',
        'destination.port': 80,
        'ecs.version': '1.0.0-beta2',
        'event.dataset': 'iis.error',
        'event.module': 'iis',
        'fileset.name': 'error',
        'http.request.method': 'GET',
        'http.response.status_code': 503,
        'http.version': '1.1',
        'iis.error.queue_name': '-',
        'iis.error.reason_phrase': 'ConnLimit',
        'input.type': 'log',
        'log.offset': 186,
        'service.type': 'iis',
        'source.address': '172.31.77.6',
        'source.ip': '172.31.77.6',
        'source.port': 2094,
        'url.original': '/qos/1kbfile.txt',
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[iis][error] ",
  },
  Object {
    "field": "source.ip",
    "highlights": Array [],
    "value": "172.31.77.6",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "iis.error.reason_phrase",
    "highlights": Array [],
    "value": "ConnLimit",
  },
]
`);
    });
  });

  describe('in pre-ECS format', () => {
    test('iis access log', () => {
      const flattenedDocument = {
        '@timestamp': '2018-01-01T08:09:10.000Z',
        'event.dataset': 'iis.access',
        'fileset.module': 'iis',
        'fileset.name': 'access',
        'iis.access.geoip.city_name': 'Berlin',
        'iis.access.geoip.continent_name': 'Europe',
        'iis.access.geoip.country_iso_code': 'DE',
        'iis.access.geoip.location.lat': 52.4908,
        'iis.access.geoip.location.lon': 13.3275,
        'iis.access.geoip.region_iso_code': 'DE-BE',
        'iis.access.geoip.region_name': 'Land Berlin',
        'iis.access.method': 'GET',
        'iis.access.port': '80',
        'iis.access.query_string': 'q=100',
        'iis.access.referrer': '-',
        'iis.access.remote_ip': '85.181.35.98',
        'iis.access.request_time_ms': '123',
        'iis.access.response_code': '200',
        'iis.access.server_ip': '127.0.0.1',
        'iis.access.sub_status': '0',
        'iis.access.url': '/',
        'iis.access.user_agent.device': 'Other',
        'iis.access.user_agent.major': '57',
        'iis.access.user_agent.minor': '0',
        'iis.access.user_agent.name': 'Firefox',
        'iis.access.user_agent.original':
          'Mozilla/5.0+(Windows+NT+6.1;+Win64;+x64;+rv:57.0)+Gecko/20100101+Firefox/57.0',
        'iis.access.user_agent.os': 'Windows',
        'iis.access.user_agent.os_name': 'Windows',
        'iis.access.user_name': '-',
        'iis.access.win32_status': '0',
        'input.type': 'log',
        offset: 257,
        'prospector.type': 'log',
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[iis][access] ",
  },
  Object {
    "field": "iis.access.remote_ip",
    "highlights": Array [],
    "value": "85.181.35.98",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "iis.access.user_name",
    "highlights": Array [],
    "value": "-",
  },
  Object {
    "constant": " \\"",
  },
  Object {
    "field": "iis.access.method",
    "highlights": Array [],
    "value": "GET",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "iis.access.url",
    "highlights": Array [],
    "value": "/",
  },
  Object {
    "constant": " HTTP/",
  },
  Object {
    "field": "iis.access.http_version",
    "highlights": Array [],
    "value": "undefined",
  },
  Object {
    "constant": "\\" ",
  },
  Object {
    "field": "iis.access.response_code",
    "highlights": Array [],
    "value": "200",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "iis.access.body_sent.bytes",
    "highlights": Array [],
    "value": "undefined",
  },
]
`);
    });

    test('iis 7.5 access log', () => {
      const flattenedDocument = {
        '@timestamp': '2018-08-28T18:24:25.000Z',
        'event.dataset': 'iis.access',
        'fileset.module': 'iis',
        'fileset.name': 'access',
        'iis.access.method': 'GET',
        'iis.access.port': '80',
        'iis.access.query_string': '-',
        'iis.access.remote_ip': '10.100.118.31',
        'iis.access.request_time_ms': '792',
        'iis.access.response_code': '404',
        'iis.access.server_ip': '10.100.220.70',
        'iis.access.sub_status': '4',
        'iis.access.url': '/',
        'iis.access.user_agent.device': 'Other',
        'iis.access.user_agent.name': 'Other',
        'iis.access.user_agent.original':
          'Mozilla/4.0+(compatible;+MSIE+7.0;+Windows+NT+6.3;+WOW64;+Trident/7.0;+.NET4.0E;+.NET4.0C;+.NET+CLR+3.5.30729;+.NET+CLR[+2.0.50727](tel:+2050727);+.NET+CLR+3.0.30729)',
        'iis.access.user_agent.os': 'Windows',
        'iis.access.user_agent.os_name': 'Windows',
        'iis.access.user_name': '-',
        'iis.access.win32_status': '2',
        'input.type': 'log',
        offset: 244,
        'prospector.type': 'log',
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[iis][access] ",
  },
  Object {
    "field": "iis.access.remote_ip",
    "highlights": Array [],
    "value": "10.100.118.31",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "iis.access.user_name",
    "highlights": Array [],
    "value": "-",
  },
  Object {
    "constant": " \\"",
  },
  Object {
    "field": "iis.access.method",
    "highlights": Array [],
    "value": "GET",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "iis.access.url",
    "highlights": Array [],
    "value": "/",
  },
  Object {
    "constant": " HTTP/",
  },
  Object {
    "field": "iis.access.http_version",
    "highlights": Array [],
    "value": "undefined",
  },
  Object {
    "constant": "\\" ",
  },
  Object {
    "field": "iis.access.response_code",
    "highlights": Array [],
    "value": "404",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "iis.access.body_sent.bytes",
    "highlights": Array [],
    "value": "undefined",
  },
]
`);
    });

    test('iis error log', () => {
      const flattenedDocument = {
        '@timestamp': '2018-01-01T08:09:10.000Z',
        'event.dataset': 'iis.error',
        'fileset.module': 'iis',
        'fileset.name': 'error',
        'iis.error.http_version': '1.1',
        'iis.error.method': 'GET',
        'iis.error.queue_name': '-',
        'iis.error.reason_phrase': 'ConnLimit',
        'iis.error.remote_ip': '172.31.77.6',
        'iis.error.remote_port': '2094',
        'iis.error.response_code': '503',
        'iis.error.server_ip': '172.31.77.6',
        'iis.error.server_port': '80',
        'iis.error.url': '/qos/1kbfile.txt',
        'input.type': 'log',
        offset: 186,
        'prospector.type': 'log',
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[iis][error] ",
  },
  Object {
    "field": "iis.error.remote_ip",
    "highlights": Array [],
    "value": "172.31.77.6",
  },
  Object {
    "constant": " \\"",
  },
  Object {
    "field": "iis.error.method",
    "highlights": Array [],
    "value": "GET",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "iis.error.url",
    "highlights": Array [],
    "value": "/qos/1kbfile.txt",
  },
  Object {
    "constant": " HTTP/",
  },
  Object {
    "field": "iis.error.http_version",
    "highlights": Array [],
    "value": "1.1",
  },
  Object {
    "constant": "\\" ",
  },
  Object {
    "field": "iis.error.response_code",
    "highlights": Array [],
    "value": "503",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "iis.error.reason_phrase",
    "highlights": Array [],
    "value": "ConnLimit",
  },
]
`);
    });
  });
});
