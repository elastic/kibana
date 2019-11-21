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
    test('logstash log', () => {
      const flattenedDocument = {
        '@timestamp': '2017-10-23T14:20:12.046Z',
        'ecs.version': '1.0.0-beta2',
        'event.dataset': 'logstash.log',
        'event.module': 'logstash',
        'fileset.name': 'log',
        'input.type': 'log',
        'log.level': 'INFO',
        'log.offset': 0,
        'logstash.log.module': 'logstash.modules.scaffold',
        message:
          'Initializing module {:module_name=>"fb_apache", :directory=>"/usr/share/logstash/modules/fb_apache/configuration"}',
        'service.type': 'logstash',
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[",
  },
  Object {
    "field": "event.dataset",
    "highlights": Array [],
    "value": "logstash.log",
  },
  Object {
    "constant": "][",
  },
  Object {
    "field": "log.level",
    "highlights": Array [],
    "value": "INFO",
  },
  Object {
    "constant": "] ",
  },
  Object {
    "field": "message",
    "highlights": Array [],
    "value": "Initializing module {:module_name=>\\"fb_apache\\", :directory=>\\"/usr/share/logstash/modules/fb_apache/configuration\\"}",
  },
]
`);
    });

    test('logstash slowlog', () => {
      const flattenedDocument = {
        '@timestamp': '2017-10-30T09:57:58.243Z',
        'ecs.version': '1.0.0-beta2',
        'event.dataset': 'logstash.slowlog',
        'event.duration': 3027675106,
        'event.module': 'logstash',
        'fileset.name': 'slowlog',
        'input.type': 'log',
        'log.level': 'WARN',
        'log.offset': 0,
        'logstash.slowlog': {
          event:
            '"{\\"@version\\":\\"1\\",\\"@timestamp\\":\\"2017-10-30T13:57:55.130Z\\",\\"host\\":\\"sashimi\\",\\"sequence\\":0,\\"message\\":\\"Hello world!\\"}"',
          module: 'slowlog.logstash.filters.sleep',
          plugin_name: 'sleep',
          plugin_params:
            '{"time"=>3, "id"=>"e4e12a4e3082615c5427079bf4250dbfa338ebac10f8ea9912d7b98a14f56b8c"}',
          plugin_type: 'filters',
          took_in_millis: 3027,
        },
        'service.type': 'logstash',
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[Logstash][",
  },
  Object {
    "field": "log.level",
    "highlights": Array [],
    "value": "WARN",
  },
  Object {
    "constant": "] ",
  },
  Object {
    "field": "logstash.slowlog",
    "highlights": Array [],
    "value": "{\\"event\\":\\"\\\\\\"{\\\\\\\\\\\\\\"@version\\\\\\\\\\\\\\":\\\\\\\\\\\\\\"1\\\\\\\\\\\\\\",\\\\\\\\\\\\\\"@timestamp\\\\\\\\\\\\\\":\\\\\\\\\\\\\\"2017-10-30T13:57:55.130Z\\\\\\\\\\\\\\",\\\\\\\\\\\\\\"host\\\\\\\\\\\\\\":\\\\\\\\\\\\\\"sashimi\\\\\\\\\\\\\\",\\\\\\\\\\\\\\"sequence\\\\\\\\\\\\\\":0,\\\\\\\\\\\\\\"message\\\\\\\\\\\\\\":\\\\\\\\\\\\\\"Hello world!\\\\\\\\\\\\\\"}\\\\\\"\\",\\"module\\":\\"slowlog.logstash.filters.sleep\\",\\"plugin_name\\":\\"sleep\\",\\"plugin_params\\":\\"{\\\\\\"time\\\\\\"=>3, \\\\\\"id\\\\\\"=>\\\\\\"e4e12a4e3082615c5427079bf4250dbfa338ebac10f8ea9912d7b98a14f56b8c\\\\\\"}\\",\\"plugin_type\\":\\"filters\\",\\"took_in_millis\\":3027}",
  },
]
`);
    });
  });

  describe('in pre-ECS format', () => {
    test('logstash log', () => {
      const flattenedDocument = {
        '@timestamp': '2017-10-23T14:20:12.046Z',
        'event.dataset': 'logstash.log',
        'fileset.module': 'logstash',
        'fileset.name': 'log',
        'input.type': 'log',
        'logstash.log.level': 'INFO',
        'logstash.log.message':
          'Initializing module {:module_name=>"fb_apache", :directory=>"/usr/share/logstash/modules/fb_apache/configuration"}',
        'logstash.log.module': 'logstash.modules.scaffold',
        offset: 0,
        'prospector.type': 'log',
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[Logstash][",
  },
  Object {
    "field": "logstash.log.level",
    "highlights": Array [],
    "value": "INFO",
  },
  Object {
    "constant": "] ",
  },
  Object {
    "field": "logstash.log.module",
    "highlights": Array [],
    "value": "logstash.modules.scaffold",
  },
  Object {
    "constant": " - ",
  },
  Object {
    "field": "logstash.log.message",
    "highlights": Array [],
    "value": "Initializing module {:module_name=>\\"fb_apache\\", :directory=>\\"/usr/share/logstash/modules/fb_apache/configuration\\"}",
  },
]
`);
    });

    test('logstash slowlog', () => {
      const flattenedDocument = {
        '@timestamp': '2017-10-30T09:57:58.243Z',
        'event.dataset': 'logstash.slowlog',
        'fileset.module': 'logstash',
        'fileset.name': 'slowlog',
        'input.type': 'log',
        'logstash.slowlog.event':
          '"{\\"@version\\":\\"1\\",\\"@timestamp\\":\\"2017-10-30T13:57:55.130Z\\",\\"host\\":\\"sashimi\\",\\"sequence\\":0,\\"message\\":\\"Hello world!\\"}"',
        'logstash.slowlog.level': 'WARN',
        'logstash.slowlog.message':
          'event processing time {:plugin_params=>{"time"=>3, "id"=>"e4e12a4e3082615c5427079bf4250dbfa338ebac10f8ea9912d7b98a14f56b8c"}, :took_in_nanos=>3027675106, :took_in_millis=>3027, :event=>"{\\"@version\\":\\"1\\",\\"@timestamp\\":\\"2017-10-30T13:57:55.130Z\\",\\"host\\":\\"sashimi\\",\\"sequence\\":0,\\"message\\":\\"Hello world!\\"}"}',
        'logstash.slowlog.module': 'slowlog.logstash.filters.sleep',
        'logstash.slowlog.plugin_name': 'sleep',
        'logstash.slowlog.plugin_params':
          '{"time"=>3, "id"=>"e4e12a4e3082615c5427079bf4250dbfa338ebac10f8ea9912d7b98a14f56b8c"}',
        'logstash.slowlog.plugin_type': 'filters',
        'logstash.slowlog.took_in_millis': 3027,
        'logstash.slowlog.took_in_nanos': 3027675106,
        offset: 0,
        'prospector.type': 'log',
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[Logstash][",
  },
  Object {
    "field": "logstash.slowlog.level",
    "highlights": Array [],
    "value": "WARN",
  },
  Object {
    "constant": "] ",
  },
  Object {
    "field": "logstash.slowlog.module",
    "highlights": Array [],
    "value": "slowlog.logstash.filters.sleep",
  },
  Object {
    "constant": " - ",
  },
  Object {
    "field": "logstash.slowlog.message",
    "highlights": Array [],
    "value": "event processing time {:plugin_params=>{\\"time\\"=>3, \\"id\\"=>\\"e4e12a4e3082615c5427079bf4250dbfa338ebac10f8ea9912d7b98a14f56b8c\\"}, :took_in_nanos=>3027675106, :took_in_millis=>3027, :event=>\\"{\\\\\\"@version\\\\\\":\\\\\\"1\\\\\\",\\\\\\"@timestamp\\\\\\":\\\\\\"2017-10-30T13:57:55.130Z\\\\\\",\\\\\\"host\\\\\\":\\\\\\"sashimi\\\\\\",\\\\\\"sequence\\\\\\":0,\\\\\\"message\\\\\\":\\\\\\"Hello world!\\\\\\"}\\"}",
  },
]
`);
    });
  });
});
