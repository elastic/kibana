/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndexRequest } from '@elastic/elasticsearch/lib/api/types';
import { createRandom } from './random';

/**
 * Documents for the copied security fixture indices.
 *
 * The upstream suite creates those indices with mappings only, which makes every executable query
 * score a perfect result equivalence (empty rows vs empty rows) — a free win the optimizer would
 * happily chase. Seeding real rows is what makes the reward discriminative, so these documents are
 * part of the measurement apparatus, not decoration.
 */

const LOGS_INDEX = 'logs-production.evaluations.2025.01.01';
const POSTGRES_INDEX = 'postgres-logs-production.evaluations.2025.01.01';
const PACKETBEAT_INDEX = 'packetbeat-production.evaluations.2025.01.01';
const NYC_TAXIS_INDEX = 'nyc_taxis-production.evaluations.2025.01.01';
const METRICBEAT_INDEX = 'metricbeat-production.evaluations-2025.01.01';
const EMPLOYEES_INDEX = 'employees-production.evaluations.2025.01.01';

const PROCESS_NAMES = [
  'curl.exe',
  'powershell.exe',
  'sshd',
  'ssh',
  'chrome.exe',
  'rare-tool.exe',
  'backup.sh',
];
const HOSTS = ['host-a', 'host-b', 'host-c', 'host-d'];
const USERS = ['alice', 'bob', 'carol', 'dan'];
const DOMAINS = ['paypa1-login.com', 'banking-secure.net', 'elastic.co', 'github.com', 'cdn.io'];
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64)',
  'curl/8.4.0',
  'RareBot/0.1 (Linux; 5.4)',
];
const EVENT_ACTIONS = ['failed_login', 'creation', 'deletion', 'connection'];
const ERROR_CODES = ['404', '403', '500'];

const buildLogs = (): IndexRequest[] => {
  const random = createRandom('logs');
  const now = Date.UTC(2025, 0, 1, 12);

  return Array.from({ length: 300 }, (unused, i) => {
    const process = random.pick(PROCESS_NAMES);
    const outbound = random.float() < 0.5;
    return {
      index: LOGS_INDEX,
      id: `log-${i}`,
      document: {
        '@timestamp': new Date(now - i * 60_000).toISOString(),
        bytes_transferred: Math.round(random.float() * 2_000_000),
        command_line: process === 'powershell.exe' ? 'powershell -EncodedCommand ZQBj' : process,
        destination: {
          ip: `10.${random.int(5)}.${random.int(255)}.${random.int(255)}`,
          port: random.pick([22, 80, 443, 2222, 8080]),
          address: `dst-${random.int(12)}`,
        },
        dns: {
          question: {
            name: `${random.pick(['a', 'b', 'c', 'd', 'e'])}.${random.pick(DOMAINS)}`,
          },
        },
        error_code: random.pick(ERROR_CODES),
        event: {
          category: random.pick(['file', 'network', 'process', 'authentication']),
          action: random.pick(EVENT_ACTIONS),
          type: random.pick(['start', 'end', 'info', 'creation']),
          code: random.pick([4624, 4625, 4688]),
        },
        // ECS fields the published detection rules rely on most; without them their queries
        // cannot run here, and those rules are the most realistic analytic intent available.
        host: {
          name: random.pick(HOSTS),
          os: { type: random.pick(['windows', 'linux', 'macos']) },
        },
        group: { name: random.pick(['admins', 'devs', 'ops']) },
        ip: `192.168.${random.int(10)}.${random.int(255)}`,
        log: { message: random.float() < 0.1 ? 'evilpayload detected' : `routine message ${i}` },
        network: {
          bytes: Math.round(random.float() * 3_000_000),
          direction: outbound ? 'outbound' : 'inbound',
        },
        process: {
          name: process,
          executable: `/usr/bin/${process}`,
          args: [process, random.pick(['--quiet', '-f', '--recursive'])],
          command_line:
            process === 'powershell.exe' ? 'powershell -EncodedCommand ZQBj' : `${process} --run`,
          parent: { name: random.pick(['bash', 'explorer.exe', 'systemd']) },
          working_directory: random.float() < 0.2 ? '/tmp/stage' : '/usr/local/bin',
        },
        file: { name: `file-${random.int(40)}.txt`, path: `/var/data/file-${random.int(40)}.txt` },
        source: {
          ip: `172.16.${random.int(10)}.${random.int(255)}`,
          bytes: Math.round(random.float() * 500_000),
        },
        system: { cpu: { total: { norm: { pct: Number(random.float().toFixed(3)) } } } },
        url: {
          domain: random.pick(DOMAINS),
          path: random.float() < 0.2 ? '/admin/panel' : '/home',
        },
        user: { name: random.pick(USERS) },
        user_agent: { original: random.pick(USER_AGENTS) },
      },
    };
  });
};

const buildPostgresLogs = (): IndexRequest[] => {
  const random = createRandom('postgres');
  return Array.from({ length: 120 }, (unused, i) => ({
    index: POSTGRES_INDEX,
    id: `pg-${i}`,
    document: {
      message: `2025-01-01T00:00:00.000Z - statement: SELECT ${i} duration: ${(
        random.float() * 500
      ).toFixed(1)} ms - 10.0.0.${random.int(255)}`,
    },
  }));
};

const buildPacketbeat = (): IndexRequest[] => {
  const random = createRandom('packetbeat');
  return Array.from({ length: 150 }, (unused, i) => ({
    index: PACKETBEAT_INDEX,
    id: `pb-${i}`,
    document: { destination: { domain: random.pick(DOMAINS) } },
  }));
};

const buildNycTaxis = (): IndexRequest[] => {
  const random = createRandom('taxis');
  return Array.from({ length: 150 }, (unused, i) => ({
    index: NYC_TAXIS_INDEX,
    id: `taxi-${i}`,
    document: {
      drop_off_time: new Date(
        Date.UTC(2025, 0, 1 + random.int(10), random.int(24), random.int(60))
      ).toISOString(),
      passenger_count: 1 + random.int(5),
      total_amount: Number((5 + random.float() * 60).toFixed(2)),
    },
  }));
};

const buildMetricbeat = (): IndexRequest[] => {
  const random = createRandom('metricbeat');
  return Array.from({ length: 160 }, (unused, i) => ({
    index: METRICBEAT_INDEX,
    id: `mb-${i}`,
    document: {
      '@timestamp': new Date(Date.UTC(2025, 0, 1, 0, i)).toISOString(),
      system: {
        cpu: {
          user: { pct: Number(random.float().toFixed(3)) },
          system: { pct: Number((random.float() / 2).toFixed(3)) },
          cores: random.pick([2, 4, 8]),
        },
      },
      host: { name: random.pick(HOSTS) },
    },
  }));
};

const buildEmployees = (): IndexRequest[] => {
  const random = createRandom('employees');
  return Array.from({ length: 100 }, (unused, i) => ({
    index: EMPLOYEES_INDEX,
    id: `emp-${i}`,
    document: {
      emp_no: `${10000 + i}`,
      hire_date: `${2015 + random.int(9)}-${String(1 + random.int(12)).padStart(2, '0')}-${String(
        1 + random.int(28)
      ).padStart(2, '0')}`,
      salary: 40000 + random.int(90000),
      country: random.pick(['NL', 'DE', 'FR', 'US']),
    },
  }));
};

export const syntheticFixtureDocuments: IndexRequest[] = [
  ...buildLogs(),
  ...buildPostgresLogs(),
  ...buildPacketbeat(),
  ...buildNycTaxis(),
  ...buildMetricbeat(),
  ...buildEmployees(),
];
