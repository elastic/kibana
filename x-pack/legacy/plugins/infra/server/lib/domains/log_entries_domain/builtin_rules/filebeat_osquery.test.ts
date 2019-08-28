/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compileFormattingRules } from '../message';
import { filebeatOsqueryRules } from './filebeat_osquery';

const { format } = compileFormattingRules(filebeatOsqueryRules);

describe('Filebeat Rules', () => {
  describe('in pre-ECS format', () => {
    test('osquery result log', () => {
      const flattenedDocument = {
        '@timestamp': '2017-12-28T14:40:08.000Z',
        'event.dataset': 'osquery.result',
        'fileset.module': 'osquery',
        'fileset.name': 'result',
        'input.type': 'log',
        offset: 0,
        'osquery.result.action': 'removed',
        'osquery.result.calendar_time': 'Thu Dec 28 14:40:08 2017 UTC',
        'osquery.result.columns': {
          blocks: '122061322',
          blocks_available: '75966945',
          blocks_free: '121274885',
          blocks_size: '4096',
          device: '/dev/disk1s4',
          device_alias: '/dev/disk1s4',
          flags: '345018372',
          inodes: '9223372036854775807',
          inodes_free: '9223372036854775804',
          path: '/private/var/vm',
          type: 'apfs',
        },
        'osquery.result.counter': '1',
        'osquery.result.decorations.host_uuid': '4AB2906D-5516-5794-AF54-86D1D7F533F3',
        'osquery.result.decorations.username': 'tsg',
        'osquery.result.epoch': '0',
        'osquery.result.host_identifier': '192-168-0-4.rdsnet.ro',
        'osquery.result.name': 'pack_it-compliance_mounts',
        'osquery.result.unix_time': '1514472008',
        'prospector.type': 'log',
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[Osquery][",
  },
  Object {
    "field": "osquery.result.action",
    "highlights": Array [],
    "value": "removed",
  },
  Object {
    "constant": "] ",
  },
  Object {
    "field": "osquery.result.host_identifier",
    "highlights": Array [],
    "value": "192-168-0-4.rdsnet.ro",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "osquery.result.columns",
    "highlights": Array [],
    "value": "{\\"blocks\\":\\"122061322\\",\\"blocks_available\\":\\"75966945\\",\\"blocks_free\\":\\"121274885\\",\\"blocks_size\\":\\"4096\\",\\"device\\":\\"/dev/disk1s4\\",\\"device_alias\\":\\"/dev/disk1s4\\",\\"flags\\":\\"345018372\\",\\"inodes\\":\\"9223372036854775807\\",\\"inodes_free\\":\\"9223372036854775804\\",\\"path\\":\\"/private/var/vm\\",\\"type\\":\\"apfs\\"}",
  },
]
`);
    });
  });
});
