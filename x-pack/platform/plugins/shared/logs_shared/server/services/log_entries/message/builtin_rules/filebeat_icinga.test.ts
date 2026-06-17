/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compileFormattingRules } from '../message';
import { filebeatIcingaRules } from './filebeat_icinga';

const { format } = compileFormattingRules(filebeatIcingaRules);

describe('Filebeat Rules', () => {
  describe('in pre-ECS format', () => {
    test('icinga debug log', () => {
      const flattenedDocument = {
        '@timestamp': ['2017-04-04T11:43:09.000Z'],
        'event.dataset': ['icinga.debug'],
        'fileset.module': ['icinga'],
        'fileset.name': ['debug'],
        'icinga.debug.facility': ['GraphiteWriter'],
        'icinga.debug.message': [
          "Add to metric list:'icinga2.demo.services.procs.procs.perfdata.procs.warn 250 1491306189'.",
        ],
        'icinga.debug.severity': ['debug'],
        'input.type': ['log'],
        offset: [0],
        'prospector.type': ['log'],
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
        Array [
          Object {
            "constant": "[Icinga][",
          },
          Object {
            "field": "icinga.debug.facility",
            "highlights": Array [],
            "value": Array [
              "GraphiteWriter",
            ],
          },
          Object {
            "constant": "][",
          },
          Object {
            "field": "icinga.debug.severity",
            "highlights": Array [],
            "value": Array [
              "debug",
            ],
          },
          Object {
            "constant": "] ",
          },
          Object {
            "field": "icinga.debug.message",
            "highlights": Array [],
            "value": Array [
              "Add to metric list:'icinga2.demo.services.procs.procs.perfdata.procs.warn 250 1491306189'.",
            ],
          },
        ]
      `);
    });

    test('icinga main log', () => {
      const flattenedDocument = {
        '@timestamp': ['2017-04-04T09:16:34.000Z'],
        'event.dataset': ['icinga.main'],
        'fileset.module': ['icinga'],
        'fileset.name': ['main'],
        'icinga.main.facility': ['Notification'],
        'icinga.main.message': [
          "Sending 'Recovery' notification 'demo!load!mail-icingaadmin for user 'on-call'",
        ],
        'icinga.main.severity': ['information'],
        'input.type': ['log'],
        offset: [0],
        'prospector.type': ['log'],
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
        Array [
          Object {
            "constant": "[Icinga][",
          },
          Object {
            "field": "icinga.main.facility",
            "highlights": Array [],
            "value": Array [
              "Notification",
            ],
          },
          Object {
            "constant": "][",
          },
          Object {
            "field": "icinga.main.severity",
            "highlights": Array [],
            "value": Array [
              "information",
            ],
          },
          Object {
            "constant": "] ",
          },
          Object {
            "field": "icinga.main.message",
            "highlights": Array [],
            "value": Array [
              "Sending 'Recovery' notification 'demo!load!mail-icingaadmin for user 'on-call'",
            ],
          },
        ]
      `);
    });

    test('icinga startup log', () => {
      const flattenedDocument = {
        'event.dataset': ['icinga.startup'],
        'fileset.module': ['icinga'],
        'fileset.name': ['startup'],
        'icinga.startup.facility': ['cli'],
        'icinga.startup.message': ['Icinga application loader (version: r2.6.3-1)'],
        'icinga.startup.severity': ['information'],
        'input.type': ['log'],
        offset: [0],
        'prospector.type': ['log'],
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
        Array [
          Object {
            "constant": "[Icinga][",
          },
          Object {
            "field": "icinga.startup.facility",
            "highlights": Array [],
            "value": Array [
              "cli",
            ],
          },
          Object {
            "constant": "][",
          },
          Object {
            "field": "icinga.startup.severity",
            "highlights": Array [],
            "value": Array [
              "information",
            ],
          },
          Object {
            "constant": "] ",
          },
          Object {
            "field": "icinga.startup.message",
            "highlights": Array [],
            "value": Array [
              "Icinga application loader (version: r2.6.3-1)",
            ],
          },
        ]
      `);
    });
  });
});
