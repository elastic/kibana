/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compileFormattingRules } from '../message';
import { filebeatAuditdRules } from './filebeat_auditd';

const { format } = compileFormattingRules(filebeatAuditdRules);

describe('Filebeat Rules', () => {
  describe('in ECS format', () => {
    test('auditd log with outcome', () => {
      const flattenedDocument = {
        '@timestamp': '2016-12-07T02:17:21.515Z',
        'auditd.log': {
          addr: '96.241.146.97',
          cipher: 'chacha20-poly1305@openssh.com',
          direction: 'from-server',
          ksize: '512',
          laddr: '10.142.0.2',
          lport: '22',
          pfs: 'curve25519-sha256@libssh.org',
          rport: '63927',
          sequence: 406,
          ses: '4294967295',
          spid: '1299',
          subj: 'system_u:system_r:sshd_t:s0-s0:c0.c1023',
        },
        'ecs.version': '1.0.0-beta2',
        'event.action': 'crypto_session',
        'event.dataset': 'auditd.log',
        'event.module': 'auditd',
        'event.outcome': 'success',
        'fileset.name': 'log',
        'input.type': 'log',
        'log.offset': 783,
        message: 'op=start',
        process: { executable: '/usr/sbin/sshd', pid: 1298 },
        'service.type': 'auditd',
        user: { 'audit.id': '4294967295', id: '0', 'saved.id': '74' },
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[AuditD][",
  },
  Object {
    "field": "event.action",
    "highlights": Array [],
    "value": "crypto_session",
  },
  Object {
    "constant": "]",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "event.outcome",
    "highlights": Array [],
    "value": "success",
  },
  Object {
    "constant": " ",
  },
  Object {
    "constant": "user",
  },
  Object {
    "constant": "=",
  },
  Object {
    "field": "user",
    "highlights": Array [],
    "value": "{\\"audit.id\\":\\"4294967295\\",\\"id\\":\\"0\\",\\"saved.id\\":\\"74\\"}",
  },
  Object {
    "constant": " ",
  },
  Object {
    "constant": "process",
  },
  Object {
    "constant": "=",
  },
  Object {
    "field": "process",
    "highlights": Array [],
    "value": "{\\"executable\\":\\"/usr/sbin/sshd\\",\\"pid\\":1298}",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "auditd.log",
    "highlights": Array [],
    "value": "{\\"addr\\":\\"96.241.146.97\\",\\"cipher\\":\\"chacha20-poly1305@openssh.com\\",\\"direction\\":\\"from-server\\",\\"ksize\\":\\"512\\",\\"laddr\\":\\"10.142.0.2\\",\\"lport\\":\\"22\\",\\"pfs\\":\\"curve25519-sha256@libssh.org\\",\\"rport\\":\\"63927\\",\\"sequence\\":406,\\"ses\\":\\"4294967295\\",\\"spid\\":\\"1299\\",\\"subj\\":\\"system_u:system_r:sshd_t:s0-s0:c0.c1023\\"}",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "message",
    "highlights": Array [],
    "value": "op=start",
  },
]
`);
    });

    test('auditd log without outcome', () => {
      const flattenedDocument = {
        '@timestamp': '2017-01-31T20:17:14.891Z',
        'auditd.log': {
          a0: '9',
          a1: '7f564b2672a0',
          a2: 'b8',
          a3: '0',
          exit: '184',
          items: '0',
          sequence: 18877199,
          ses: '4294967295',
          success: 'yes',
          syscall: '44',
          tty: '(none)',
        },
        'ecs.version': '1.0.0-beta2',
        'event.action': 'syscall',
        'event.dataset': 'auditd.log',
        'event.module': 'auditd',
        'fileset.name': 'log',
        'host.architecture': 'x86_64',
        'input.type': 'log',
        'log.offset': 174,
        process: {
          executable: '/usr/libexec/strongswan/charon (deleted)',
          name: 'charon',
          pid: 1281,
          ppid: 1240,
        },
        'service.type': 'auditd',
        user: {
          'audit.id': '4294967295',
          'effective.group.id': '0',
          'effective.id': '0',
          'filesystem.group.id': '0',
          'filesystem.id': '0',
          'group.id': '0',
          id: '0',
          'saved.group.id': '0',
          'saved.id': '0',
        },
      };

      expect(format(flattenedDocument, {})).toMatchInlineSnapshot(`
Array [
  Object {
    "constant": "[AuditD][",
  },
  Object {
    "field": "event.action",
    "highlights": Array [],
    "value": "syscall",
  },
  Object {
    "constant": "]",
  },
  Object {
    "constant": " ",
  },
  Object {
    "constant": "user",
  },
  Object {
    "constant": "=",
  },
  Object {
    "field": "user",
    "highlights": Array [],
    "value": "{\\"audit.id\\":\\"4294967295\\",\\"effective.group.id\\":\\"0\\",\\"effective.id\\":\\"0\\",\\"filesystem.group.id\\":\\"0\\",\\"filesystem.id\\":\\"0\\",\\"group.id\\":\\"0\\",\\"id\\":\\"0\\",\\"saved.group.id\\":\\"0\\",\\"saved.id\\":\\"0\\"}",
  },
  Object {
    "constant": " ",
  },
  Object {
    "constant": "process",
  },
  Object {
    "constant": "=",
  },
  Object {
    "field": "process",
    "highlights": Array [],
    "value": "{\\"executable\\":\\"/usr/libexec/strongswan/charon (deleted)\\",\\"name\\":\\"charon\\",\\"pid\\":1281,\\"ppid\\":1240}",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "auditd.log",
    "highlights": Array [],
    "value": "{\\"a0\\":\\"9\\",\\"a1\\":\\"7f564b2672a0\\",\\"a2\\":\\"b8\\",\\"a3\\":\\"0\\",\\"exit\\":\\"184\\",\\"items\\":\\"0\\",\\"sequence\\":18877199,\\"ses\\":\\"4294967295\\",\\"success\\":\\"yes\\",\\"syscall\\":\\"44\\",\\"tty\\":\\"(none)\\"}",
  },
  Object {
    "constant": " ",
  },
  Object {
    "field": "message",
    "highlights": Array [],
    "value": "undefined",
  },
]
`);
    });
  });

  describe('in pre-ECS format', () => {
    test('auditd IPSEC rule', () => {
      const event = {
        '@timestamp': '2017-01-31T20:17:14.891Z',
        'auditd.log.auid': '4294967295',
        'auditd.log.dst': '192.168.0.0',
        'auditd.log.dst_prefixlen': '16',
        'auditd.log.op': 'SPD-delete',
        'auditd.log.record_type': 'MAC_IPSEC_EVENT',
        'auditd.log.res': '1',
        'auditd.log.sequence': 18877201,
        'auditd.log.ses': '4294967295',
        'auditd.log.src': '192.168.2.0',
        'auditd.log.src_prefixlen': '24',
        'ecs.version': '1.0.0-beta2',
        'event.dataset': 'auditd.log',
        'event.module': 'auditd',
        'fileset.name': 'log',
        'input.type': 'log',
        'log.offset': 0,
      };
      const message = format(event, {});
      expect(message).toEqual([
        { constant: '[AuditD][' },
        { field: 'auditd.log.record_type', highlights: [], value: 'MAC_IPSEC_EVENT' },
        { constant: '] src:' },
        { field: 'auditd.log.src', highlights: [], value: '192.168.2.0' },
        { constant: ' dst:' },
        { field: 'auditd.log.dst', highlights: [], value: '192.168.0.0' },
        { constant: ' op:' },
        { field: 'auditd.log.op', highlights: [], value: 'SPD-delete' },
      ]);
    });

    test('AuditD SYSCALL rule', () => {
      const event = {
        '@timestamp': '2017-01-31T20:17:14.891Z',
        'auditd.log.a0': '9',
        'auditd.log.a1': '7f564b2672a0',
        'auditd.log.a2': 'b8',
        'auditd.log.a3': '0',
        'auditd.log.arch': 'x86_64',
        'auditd.log.auid': '4294967295',
        'auditd.log.comm': 'charon',
        'auditd.log.egid': '0',
        'auditd.log.euid': '0',
        'auditd.log.exe': '/usr/libexec/strongswan/charon (deleted)',
        'auditd.log.exit': '184',
        'auditd.log.fsgid': '0',
        'auditd.log.fsuid': '0',
        'auditd.log.gid': '0',
        'auditd.log.items': '0',
        'auditd.log.pid': '1281',
        'auditd.log.ppid': '1240',
        'auditd.log.record_type': 'SYSCALL',
        'auditd.log.sequence': 18877199,
        'auditd.log.ses': '4294967295',
        'auditd.log.sgid': '0',
        'auditd.log.success': 'yes',
        'auditd.log.suid': '0',
        'auditd.log.syscall': '44',
        'auditd.log.tty': '(none)',
        'auditd.log.uid': '0',
        'ecs.version': '1.0.0-beta2',
        'event.dataset': 'auditd.log',
        'event.module': 'auditd',
        'fileset.name': 'log',
        'input.type': 'log',
        'log.offset': 174,
      };
      const message = format(event, {});
      expect(message).toEqual([
        { constant: '[AuditD][' },
        { field: 'auditd.log.record_type', highlights: [], value: 'SYSCALL' },
        { constant: '] exe:' },
        {
          field: 'auditd.log.exe',
          highlights: [],
          value: '/usr/libexec/strongswan/charon (deleted)',
        },
        { constant: ' gid:' },
        { field: 'auditd.log.gid', highlights: [], value: '0' },
        { constant: ' uid:' },
        { field: 'auditd.log.uid', highlights: [], value: '0' },
        { constant: ' tty:' },
        { field: 'auditd.log.tty', highlights: [], value: '(none)' },
        { constant: ' pid:' },
        { field: 'auditd.log.pid', highlights: [], value: '1281' },
        { constant: ' ppid:' },
        { field: 'auditd.log.ppid', highlights: [], value: '1240' },
      ]);
    });

    test('AuditD events with msg rule', () => {
      const event = {
        '@timestamp': '2017-01-31T20:17:14.891Z',
        'auditd.log.auid': '4294967295',
        'auditd.log.record_type': 'EXAMPLE',
        'auditd.log.msg': 'some kind of message',
        'ecs.version': '1.0.0-beta2',
        'event.dataset': 'auditd.log',
        'event.module': 'auditd',
        'fileset.name': 'log',
        'input.type': 'log',
        'log.offset': 174,
      };
      const message = format(event, {});
      expect(message).toEqual([
        { constant: '[AuditD][' },
        { field: 'auditd.log.record_type', highlights: [], value: 'EXAMPLE' },
        { constant: '] ' },
        {
          field: 'auditd.log.msg',
          highlights: [],
          value: 'some kind of message',
        },
      ]);
    });

    test('AuditD catchall rule', () => {
      const event = {
        '@timestamp': '2017-01-31T20:17:14.891Z',
        'auditd.log.auid': '4294967295',
        'auditd.log.record_type': 'EXAMPLE',
        'ecs.version': '1.0.0-beta2',
        'event.dataset': 'auditd.log',
        'event.module': 'auditd',
        'fileset.name': 'log',
        'input.type': 'log',
        'log.offset': 174,
      };
      const message = format(event, {});
      expect(message).toEqual([
        { constant: '[AuditD][' },
        { field: 'auditd.log.record_type', highlights: [], value: 'EXAMPLE' },
        { constant: '] Event without message.' },
      ]);
    });
  });
});
