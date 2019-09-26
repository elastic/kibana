/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { labelField } from './helpers';

const commonActionField = [{ constant: '[AuditD][' }, { field: 'event.action' }, { constant: ']' }];
const commonOutcomeField = [{ constant: ' ' }, { field: 'event.outcome' }];

export const filebeatAuditdRules = [
  {
    // ECS format with outcome
    when: {
      exists: ['ecs.version', 'event.action', 'event.outcome', 'auditd.log'],
    },
    format: [
      ...commonActionField,
      ...commonOutcomeField,
      ...labelField('user', 'user'),
      ...labelField('process', 'process'),
      { constant: ' ' },
      { field: 'auditd.log' },
      { constant: ' ' },
      { field: 'message' },
    ],
  },
  {
    // ECS format without outcome
    when: {
      exists: ['ecs.version', 'event.action', 'auditd.log'],
    },
    format: [
      ...commonActionField,
      ...labelField('user', 'user'),
      ...labelField('process', 'process'),
      { constant: ' ' },
      { field: 'auditd.log' },
      { constant: ' ' },
      { field: 'message' },
    ],
  },
  {
    // pre-ECS IPSEC_EVENT Rule
    when: {
      exists: ['auditd.log.record_type', 'auditd.log.src', 'auditd.log.dst', 'auditd.log.op'],
      values: {
        'auditd.log.record_type': 'MAC_IPSEC_EVENT',
      },
    },
    format: [
      { constant: '[AuditD][' },
      { field: 'auditd.log.record_type' },
      { constant: '] src:' },
      { field: 'auditd.log.src' },
      { constant: ' dst:' },
      { field: 'auditd.log.dst' },
      { constant: ' op:' },
      { field: 'auditd.log.op' },
    ],
  },
  {
    // pre-ECS SYSCALL Rule
    when: {
      exists: [
        'auditd.log.record_type',
        'auditd.log.exe',
        'auditd.log.gid',
        'auditd.log.uid',
        'auditd.log.tty',
        'auditd.log.pid',
        'auditd.log.ppid',
      ],
      values: {
        'auditd.log.record_type': 'SYSCALL',
      },
    },
    format: [
      { constant: '[AuditD][' },
      { field: 'auditd.log.record_type' },
      { constant: '] exe:' },
      { field: 'auditd.log.exe' },
      { constant: ' gid:' },
      { field: 'auditd.log.gid' },
      { constant: ' uid:' },
      { field: 'auditd.log.uid' },
      { constant: ' tty:' },
      { field: 'auditd.log.tty' },
      { constant: ' pid:' },
      { field: 'auditd.log.pid' },
      { constant: ' ppid:' },
      { field: 'auditd.log.ppid' },
    ],
  },
  {
    // pre-ECS Events with `msg` Rule
    when: {
      exists: ['auditd.log.record_type', 'auditd.log.msg'],
    },
    format: [
      { constant: '[AuditD][' },
      { field: 'auditd.log.record_type' },
      { constant: '] ' },
      { field: 'auditd.log.msg' },
    ],
  },
  {
    // pre-ECS Events with `msg` Rule
    when: {
      exists: ['auditd.log.record_type'],
    },
    format: [
      { constant: '[AuditD][' },
      { field: 'auditd.log.record_type' },
      { constant: '] Event without message.' },
    ],
  },
];
