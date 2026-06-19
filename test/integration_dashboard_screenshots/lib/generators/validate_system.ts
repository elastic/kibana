/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';

const DATA_DIR = path.resolve(__dirname, '..', '..', 'sample_data', 'system');

const getNestedField = (obj: Record<string, unknown>, dotPath: string): unknown => {
  const parts = dotPath.split('.');
  let current: any = obj;
  for (const p of parts) {
    if (!current || typeof current !== 'object') return undefined;
    current = current[p];
  }
  return current;
};

interface FieldCheck {
  dataset: string;
  fields: string[];
  description: string;
}

const DASHBOARD_FIELD_REQUIREMENTS: FieldCheck[] = [
  // [Metrics System] Overview dashboard
  {
    dataset: 'system.cpu',
    description: 'Metrics Overview + Host Overview',
    fields: [
      'host.name',
      'system.cpu.total.norm.pct',
      'system.cpu.user.norm.pct',
      'system.cpu.system.norm.pct',
      'system.cpu.nice.norm.pct',
      'system.cpu.iowait.norm.pct',
      'system.cpu.irq.norm.pct',
      'system.cpu.softirq.norm.pct',
    ],
  },
  {
    dataset: 'system.memory',
    description: 'Metrics Overview + Host Overview',
    fields: [
      'host.name',
      'system.memory.actual.used.pct',
      'system.memory.actual.used.bytes',
      'system.memory.total',
      'system.memory.free',
      'system.memory.used.bytes',
      'system.memory.swap.used.pct',
    ],
  },
  {
    dataset: 'system.fsstat',
    description: 'Metrics Overview + Host Overview',
    fields: [
      'host.name',
      'system.fsstat.total_size.used',
      'system.fsstat.total_size.total',
    ],
  },
  {
    dataset: 'system.filesystem',
    description: 'Host Overview',
    fields: [
      'host.name',
      'system.filesystem.used.pct',
      'system.filesystem.mount_point',
    ],
  },
  {
    dataset: 'system.network',
    description: 'Metrics Overview + Host Overview',
    fields: [
      'host.name',
      'system.network.in.bytes',
      'system.network.out.bytes',
      'system.network.in.packets',
      'system.network.out.packets',
      'system.network.in.dropped',
      'system.network.out.dropped',
      'system.network.name',
    ],
  },
  {
    dataset: 'system.load',
    description: 'Host Overview',
    fields: ['host.name', 'system.load.1', 'system.load.5', 'system.load.15'],
  },
  {
    dataset: 'system.diskio',
    description: 'Host Overview',
    fields: ['host.name', 'system.diskio.read.bytes', 'system.diskio.write.bytes'],
  },
  {
    dataset: 'system.process',
    description: 'Host Overview',
    fields: [
      'host.name',
      'process.pid',
      'process.name',
      'process.cpu.pct',
      'system.process.memory.rss.pct',
    ],
  },
  // Syslog dashboard
  {
    dataset: 'system.syslog',
    description: 'Syslog dashboard',
    fields: ['host.hostname', 'process.name', 'message'],
  },
  // SSH login attempts dashboard
  {
    dataset: 'system.auth',
    description: 'SSH login attempts + New users/groups + Sudo commands',
    fields: [
      'host.hostname',
      'user.name',
      'source.ip',
      'source.geo.country_iso_code',
      'source.geo.location',
      'system.auth.ssh.event',
      'system.auth.ssh.method',
    ],
  },
  // Windows dashboards
  {
    dataset: 'system.security',
    description: 'Windows Security dashboards (all)',
    fields: [
      'host.name',
      'event.action',
      'event.code',
      'event.outcome',
      'user.name',
      'user.domain',
      'user.id',
      'winlog.channel',
      'winlog.provider_name',
      'winlog.event_id',
      'log.level',
    ],
  },
  {
    dataset: 'system.application',
    description: 'Windows Overview dashboard',
    fields: ['winlog.channel', 'winlog.provider_name', 'winlog.event_id', 'log.level'],
  },
  {
    dataset: 'system.system',
    description: 'Windows Overview dashboard',
    fields: ['winlog.channel', 'winlog.provider_name', 'winlog.event_id', 'log.level'],
  },
];

const SPECIAL_CHECKS = [
  {
    dataset: 'system.auth',
    description: 'SSH events include Accepted/Failed/Invalid',
    check: (docs: Record<string, unknown>[]) => {
      const events = docs
        .map((d) => getNestedField(d, 'system.auth.ssh.event'))
        .filter(Boolean) as string[];
      const unique = [...new Set(events)];
      const required = ['Accepted', 'Failed', 'Invalid'];
      const missing = required.filter((r) => !unique.includes(r));
      return missing.length === 0
        ? null
        : `Missing SSH event types: ${missing.join(', ')} (found: ${unique.join(', ')})`;
    },
  },
  {
    dataset: 'system.auth',
    description: 'Sudo commands present',
    check: (docs: Record<string, unknown>[]) => {
      const cmds = docs.filter((d) => getNestedField(d, 'system.auth.sudo.command'));
      return cmds.length > 0 ? null : 'No docs with system.auth.sudo.command';
    },
  },
  {
    dataset: 'system.auth',
    description: 'Sudo errors present',
    check: (docs: Record<string, unknown>[]) => {
      const errs = docs.filter((d) => getNestedField(d, 'system.auth.sudo.error'));
      return errs.length > 0 ? null : 'No docs with system.auth.sudo.error';
    },
  },
  {
    dataset: 'system.auth',
    description: 'Useradd events present',
    check: (docs: Record<string, unknown>[]) => {
      const adds = docs.filter((d) => getNestedField(d, 'system.auth.useradd.home'));
      return adds.length > 0 ? null : 'No docs with system.auth.useradd';
    },
  },
  {
    dataset: 'system.auth',
    description: 'Group events present (group.name + group.id)',
    check: (docs: Record<string, unknown>[]) => {
      const groups = docs.filter(
        (d) => getNestedField(d, 'group.name') && getNestedField(d, 'group.id')
      );
      return groups.length > 0 ? null : 'No docs with group.name + group.id';
    },
  },
  {
    dataset: 'system.network',
    description: 'No interface names starting with l (loopback excluded by dashboard)',
    check: (docs: Record<string, unknown>[]) => {
      const bad = docs.filter((d) => {
        const name = getNestedField(d, 'system.network.name') as string;
        return name && name.startsWith('l');
      });
      return bad.length === 0 ? null : `${bad.length} docs have network.name starting with 'l'`;
    },
  },
  {
    dataset: 'system.security',
    description: 'Key event.code values present (4624, 4625, 4672, 4720, 4740)',
    check: (docs: Record<string, unknown>[]) => {
      const codes = new Set(docs.map((d) => getNestedField(d, 'event.code')).filter(Boolean));
      const required = ['4624', '4625', '4672', '4720', '4740'];
      const missing = required.filter((r) => !codes.has(r));
      return missing.length === 0
        ? null
        : `Missing event.code values: ${missing.join(', ')}`;
    },
  },
  {
    dataset: 'system.security',
    description: 'winlog.event_data.SubjectUserName present on some docs',
    check: (docs: Record<string, unknown>[]) => {
      const found = docs.filter((d) => getNestedField(d, 'winlog.event_data.SubjectUserName'));
      return found.length > 0 ? null : 'No docs with winlog.event_data.SubjectUserName';
    },
  },
  {
    dataset: 'system.security',
    description: 'winlog.logon.type present on some docs',
    check: (docs: Record<string, unknown>[]) => {
      const found = docs.filter((d) => getNestedField(d, 'winlog.logon.type'));
      return found.length > 0 ? null : 'No docs with winlog.logon.type';
    },
  },
  {
    dataset: 'system.security',
    description: 'source.ip present on some docs',
    check: (docs: Record<string, unknown>[]) => {
      const found = docs.filter((d) => getNestedField(d, 'source.ip'));
      return found.length > 0 ? null : 'No docs with source.ip';
    },
  },
  {
    dataset: 'system.security',
    description: 'group.name present on some docs',
    check: (docs: Record<string, unknown>[]) => {
      const found = docs.filter((d) => getNestedField(d, 'group.name'));
      return found.length > 0 ? null : 'No docs with group.name';
    },
  },
];

const main = () => {
  let totalErrors = 0;

  console.log('=== Validating system sample data against dashboard requirements ===\n');

  for (const req of DASHBOARD_FIELD_REQUIREMENTS) {
    const filePath = path.join(DATA_DIR, `${req.dataset}.json`);
    if (!fs.existsSync(filePath)) {
      console.log(`FAIL  ${req.dataset} — file not found: ${filePath}`);
      totalErrors++;
      continue;
    }

    const docs: Record<string, unknown>[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const missingFields: string[] = [];

    for (const field of req.fields) {
      const hasField = docs.some((d) => getNestedField(d, field) !== undefined);
      if (!hasField) missingFields.push(field);
    }

    if (missingFields.length > 0) {
      console.log(`FAIL  ${req.dataset} (${req.description})`);
      console.log(`      Missing: ${missingFields.join(', ')}`);
      totalErrors++;
    } else {
      console.log(`OK    ${req.dataset} (${req.description}) — ${docs.length} docs, all ${req.fields.length} fields present`);
    }
  }

  console.log('\n--- Special checks ---\n');

  for (const check of SPECIAL_CHECKS) {
    const filePath = path.join(DATA_DIR, `${check.dataset}.json`);
    if (!fs.existsSync(filePath)) continue;

    const docs: Record<string, unknown>[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const error = check.check(docs);

    if (error) {
      console.log(`FAIL  ${check.dataset}: ${check.description}`);
      console.log(`      ${error}`);
      totalErrors++;
    } else {
      console.log(`OK    ${check.dataset}: ${check.description}`);
    }
  }

  console.log(`\n=== ${totalErrors === 0 ? 'ALL CHECKS PASSED' : `${totalErrors} FAILURES`} ===`);
  if (totalErrors > 0) process.exit(1);
};

main();
