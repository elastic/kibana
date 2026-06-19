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

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

const OUTPUT_DIR = path.resolve(__dirname, '..', '..', 'sample_data', 'system');

const HOSTNAMES = [
  'web-prod-01',
  'web-prod-02',
  'api-server-01',
  'db-primary',
  'worker-01',
];

const SOURCE_IPS = [
  '10.0.0.15',
  '10.0.0.22',
  '10.0.1.5',
  '172.16.0.50',
  '192.168.1.100',
  '203.0.113.42',
  '198.51.100.7',
  '100.64.0.12',
  '10.0.2.100',
  '192.168.1.101',
];

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));
const randFloat = (min: number, max: number, decimals = 4) =>
  Math.round((min + Math.random() * (max - min)) * 10 ** decimals) / 10 ** decimals;
const randIp = () => `${randInt(10, 223)}.${randInt(0, 255)}.${randInt(0, 255)}.${randInt(1, 254)}`;

const baseMetricDoc = (hostIdx: number, dataset: string) => ({
  agent: {
    id: `agent-${hostIdx}`,
    type: 'metricbeat',
    version: '8.18.0',
    ephemeral_id: `eph-${randInt(1000, 9999)}`,
    name: HOSTNAMES[hostIdx],
  },
  host: {
    name: HOSTNAMES[hostIdx],
    hostname: `${HOSTNAMES[hostIdx]}.local`,
    id: `host-id-${hostIdx}`,
    ip: [SOURCE_IPS[hostIdx % SOURCE_IPS.length]],
    mac: [`02:42:AC:1${hostIdx}:00:0${hostIdx}`],
    os: {
      platform: 'linux',
      name: 'Ubuntu',
      version: '22.04',
      family: 'debian',
      type: 'linux',
      kernel: '5.15.0-generic',
    },
    architecture: 'x86_64',
  },
  ecs: { version: '8.11.0' },
  event: {
    module: 'system',
    dataset,
    duration: randInt(1e6, 1e8),
  },
  service: { type: 'system' },
  metricset: { name: dataset.replace('system.', ''), period: 10000 },
});

const baseLogDoc = (hostIdx: number, dataset: string) => ({
  agent: {
    id: `agent-${hostIdx}`,
    type: 'filebeat',
    version: '8.18.0',
    ephemeral_id: `eph-${randInt(1000, 9999)}`,
    name: HOSTNAMES[hostIdx],
  },
  host: {
    name: HOSTNAMES[hostIdx],
    hostname: `${HOSTNAMES[hostIdx]}.local`,
    id: `host-id-${hostIdx}`,
    ip: [SOURCE_IPS[hostIdx % SOURCE_IPS.length]],
    mac: [`02:42:AC:1${hostIdx}:00:0${hostIdx}`],
    os: {
      platform: 'linux',
      name: 'Ubuntu',
      version: '22.04',
      family: 'debian',
      type: 'linux',
    },
    architecture: 'x86_64',
  },
  ecs: { version: '8.11.0' },
  event: {
    module: 'system',
    dataset,
    kind: 'event',
  },
  input: { type: 'log' },
});

const writeDataset = (dataset: string, docs: Record<string, unknown>[]) => {
  const filePath = path.join(OUTPUT_DIR, `${dataset}.json`);
  fs.writeFileSync(filePath, JSON.stringify(docs, null, 2));
  console.log(`  ${dataset}: ${docs.length} docs -> ${path.relative(process.cwd(), filePath)}`);
};

// ---------------------------------------------------------------------------
// system.cpu — 750 docs
// ---------------------------------------------------------------------------

const generateCpu = (): Record<string, unknown>[] => {
  const docs: Record<string, unknown>[] = [];
  for (let i = 0; i < 750; i++) {
    const hostIdx = i % HOSTNAMES.length;
    const user = randFloat(0.05, 0.40);
    const system = randFloat(0.02, 0.20);
    const nice = randFloat(0, 0.03);
    const iowait = randFloat(0, 0.08);
    const irq = randFloat(0, 0.02);
    const softirq = randFloat(0, 0.02);
    const idle = Math.max(0, randFloat(0.3, 0.85));
    const total = Math.min(1, user + system + nice + iowait + irq + softirq);
    const cores = pick([4, 8, 16]);

    docs.push({
      ...baseMetricDoc(hostIdx, 'system.cpu'),
      system: {
        cpu: {
          cores,
          user: { pct: user * cores, norm: { pct: user }, ticks: randInt(1e6, 1e9) },
          system: { pct: system * cores, norm: { pct: system }, ticks: randInt(1e6, 1e9) },
          nice: { pct: nice * cores, norm: { pct: nice }, ticks: randInt(0, 1e7) },
          idle: { pct: idle * cores, norm: { pct: idle }, ticks: randInt(1e8, 1e10) },
          iowait: { pct: iowait * cores, norm: { pct: iowait }, ticks: randInt(0, 1e8) },
          irq: { pct: irq * cores, norm: { pct: irq }, ticks: randInt(0, 1e7) },
          softirq: { pct: softirq * cores, norm: { pct: softirq }, ticks: randInt(0, 1e7) },
          steal: { pct: 0, norm: { pct: 0 }, ticks: 0 },
          total: { pct: total * cores, norm: { pct: randFloat(0.1, 0.7) } },
        },
      },
    });
  }
  return docs;
};

// ---------------------------------------------------------------------------
// system.memory — 750 docs
// ---------------------------------------------------------------------------

const generateMemory = (): Record<string, unknown>[] => {
  const docs: Record<string, unknown>[] = [];
  const totals = [8e9, 16e9, 32e9, 16e9, 64e9]; // per host
  const swapTotals = [2e9, 4e9, 8e9, 4e9, 16e9];

  for (let i = 0; i < 750; i++) {
    const hostIdx = i % HOSTNAMES.length;
    const total = totals[hostIdx];
    const swapTotal = swapTotals[hostIdx];
    const usedPct = randFloat(0.30, 0.85);
    const usedBytes = Math.round(total * usedPct);
    const freeBytes = total - usedBytes;
    const actualUsedPct = randFloat(0.25, 0.80);
    const actualUsedBytes = Math.round(total * actualUsedPct);
    const actualFree = total - actualUsedBytes;
    const swapUsedPct = randFloat(0, 0.30);
    const swapUsedBytes = Math.round(swapTotal * swapUsedPct);
    const swapFree = swapTotal - swapUsedBytes;

    docs.push({
      ...baseMetricDoc(hostIdx, 'system.memory'),
      system: {
        memory: {
          total,
          used: { bytes: usedBytes, pct: usedPct },
          free: freeBytes,
          actual: {
            used: { bytes: actualUsedBytes, pct: actualUsedPct },
            free: actualFree,
          },
          swap: {
            total: swapTotal,
            used: { bytes: swapUsedBytes, pct: swapUsedPct },
            free: swapFree,
          },
        },
      },
    });
  }
  return docs;
};

// ---------------------------------------------------------------------------
// system.fsstat — 500 docs
// ---------------------------------------------------------------------------

const generateFsstat = (): Record<string, unknown>[] => {
  const docs: Record<string, unknown>[] = [];
  const diskTotals = [500e9, 1000e9, 250e9, 2000e9, 500e9];

  for (let i = 0; i < 500; i++) {
    const hostIdx = i % HOSTNAMES.length;
    const total = diskTotals[hostIdx];
    const usedPct = randFloat(0.20, 0.80);
    const used = Math.round(total * usedPct);
    const free = total - used;

    docs.push({
      ...baseMetricDoc(hostIdx, 'system.fsstat'),
      system: {
        fsstat: {
          count: randInt(2, 6),
          total_files: randInt(100000, 2000000),
          total_size: { total, used, free },
        },
      },
    });
  }
  return docs;
};

// ---------------------------------------------------------------------------
// system.filesystem — 500 docs
// ---------------------------------------------------------------------------

const MOUNT_POINTS = ['/', '/home', '/var', '/tmp', '/data'];
const DEVICE_NAMES = ['/dev/sda1', '/dev/sda2', '/dev/sdb1', '/dev/nvme0n1p1', '/dev/nvme0n1p2'];

const generateFilesystem = (): Record<string, unknown>[] => {
  const docs: Record<string, unknown>[] = [];
  for (let i = 0; i < 500; i++) {
    const hostIdx = i % HOSTNAMES.length;
    const mountIdx = i % MOUNT_POINTS.length;
    const total = pick([50e9, 100e9, 200e9, 500e9, 1000e9]);
    const usedPct = randFloat(0.10, 0.90);
    const usedBytes = Math.round(total * usedPct);
    const freeBytes = total - usedBytes;
    const available = freeBytes - randInt(0, Math.round(freeBytes * 0.05));

    docs.push({
      ...baseMetricDoc(hostIdx, 'system.filesystem'),
      system: {
        filesystem: {
          mount_point: MOUNT_POINTS[mountIdx],
          device_name: DEVICE_NAMES[mountIdx],
          type: 'ext4',
          total,
          used: { bytes: usedBytes, pct: usedPct },
          free: freeBytes,
          available: Math.max(0, available),
          files: randInt(1000000, 10000000),
          free_files: randInt(500000, 9000000),
        },
      },
    });
  }
  return docs;
};

// ---------------------------------------------------------------------------
// system.network — 750 docs
// No interface names starting with 'l' (dashboard excludes loopback)
// ---------------------------------------------------------------------------

const NETWORK_INTERFACES = ['eth0', 'eth1', 'ens5', 'ens160', 'bond0'];

const generateNetwork = (): Record<string, unknown>[] => {
  const docs: Record<string, unknown>[] = [];
  const counters: Record<string, { inB: number; outB: number; inP: number; outP: number }> = {};

  for (let i = 0; i < 750; i++) {
    const hostIdx = i % HOSTNAMES.length;
    const iface = NETWORK_INTERFACES[i % NETWORK_INTERFACES.length];
    const key = `${HOSTNAMES[hostIdx]}-${iface}`;

    if (!counters[key]) {
      counters[key] = {
        inB: randInt(1e8, 1e10),
        outB: randInt(1e8, 1e10),
        inP: randInt(1e5, 1e7),
        outP: randInt(1e5, 1e7),
      };
    }

    const c = counters[key];
    c.inB += randInt(1e5, 5e7);
    c.outB += randInt(1e5, 5e7);
    c.inP += randInt(100, 50000);
    c.outP += randInt(100, 50000);

    docs.push({
      ...baseMetricDoc(hostIdx, 'system.network'),
      system: {
        network: {
          name: iface,
          in: {
            bytes: c.inB,
            packets: c.inP,
            errors: randInt(0, 5),
            dropped: randInt(0, 3),
          },
          out: {
            bytes: c.outB,
            packets: c.outP,
            errors: randInt(0, 3),
            dropped: randInt(0, 2),
          },
        },
      },
    });
  }
  return docs;
};

// ---------------------------------------------------------------------------
// system.load — 750 docs
// ---------------------------------------------------------------------------

const generateLoad = (): Record<string, unknown>[] => {
  const docs: Record<string, unknown>[] = [];
  for (let i = 0; i < 750; i++) {
    const hostIdx = i % HOSTNAMES.length;
    const cores = pick([4, 8, 16]);
    const load1 = randFloat(0.1, cores * 0.8, 2);
    const load5 = randFloat(0.1, cores * 0.6, 2);
    const load15 = randFloat(0.1, cores * 0.5, 2);

    docs.push({
      ...baseMetricDoc(hostIdx, 'system.load'),
      system: {
        load: {
          1: load1,
          5: load5,
          15: load15,
          norm: {
            1: randFloat(0.01, 0.8, 2),
            5: randFloat(0.01, 0.6, 2),
            15: randFloat(0.01, 0.5, 2),
          },
          cores,
        },
      },
    });
  }
  return docs;
};

// ---------------------------------------------------------------------------
// system.diskio — 500 docs
// ---------------------------------------------------------------------------

const DISK_NAMES = ['sda', 'sdb', 'nvme0n1'];

const generateDiskio = (): Record<string, unknown>[] => {
  const docs: Record<string, unknown>[] = [];
  const counters: Record<string, { rB: number; wB: number }> = {};

  for (let i = 0; i < 500; i++) {
    const hostIdx = i % HOSTNAMES.length;
    const diskName = DISK_NAMES[i % DISK_NAMES.length];
    const key = `${HOSTNAMES[hostIdx]}-${diskName}`;

    if (!counters[key]) {
      counters[key] = { rB: randInt(1e8, 1e11), wB: randInt(1e8, 1e11) };
    }

    const c = counters[key];
    c.rB += randInt(1e5, 1e8);
    c.wB += randInt(1e5, 1e8);

    docs.push({
      ...baseMetricDoc(hostIdx, 'system.diskio'),
      system: {
        diskio: {
          name: diskName,
          read: {
            bytes: c.rB,
            count: randInt(1000, 1000000),
            time: randInt(100, 100000),
          },
          write: {
            bytes: c.wB,
            count: randInt(1000, 1000000),
            time: randInt(100, 100000),
          },
          io: { time: randInt(1000, 500000) },
        },
      },
    });
  }
  return docs;
};

// ---------------------------------------------------------------------------
// system.process — 750 docs
// ---------------------------------------------------------------------------

const PROCESS_NAMES = [
  'java', 'node', 'python3', 'nginx', 'postgres',
  'redis-server', 'dockerd', 'kubelet', 'elastic-agent', 'metricbeat',
  'filebeat', 'systemd', 'sshd', 'cron', 'bash',
];

const PROCESS_STATES = ['sleeping', 'running', 'sleeping', 'sleeping', 'idle'];

const generateProcess = (): Record<string, unknown>[] => {
  const docs: Record<string, unknown>[] = [];
  for (let i = 0; i < 750; i++) {
    const hostIdx = i % HOSTNAMES.length;
    const procName = PROCESS_NAMES[i % PROCESS_NAMES.length];
    const pid = 1000 + i;
    const cpuPct = randFloat(0, 0.95);
    const memRssPct = randFloat(0.001, 0.15);
    const memRssBytes = Math.round(memRssPct * 16e9);

    docs.push({
      ...baseMetricDoc(hostIdx, 'system.process'),
      process: {
        pid,
        name: procName,
        executable: `/usr/bin/${procName}`,
        args: [`/usr/bin/${procName}`, '--config', '/etc/config.yml'],
        command_line: `/usr/bin/${procName} --config /etc/config.yml`,
        state: pick(PROCESS_STATES),
        parent: { pid: randInt(1, 999) },
        pgid: pid,
        working_directory: '/opt/app',
        cpu: {
          pct: cpuPct,
          start_time: new Date(Date.now() - randInt(3600000, 86400000 * 30)).toISOString(),
        },
        memory: { pct: memRssPct },
      },
      system: {
        process: {
          state: pick(PROCESS_STATES),
          cmdline: `/usr/bin/${procName} --config /etc/config.yml`,
          num_threads: randInt(1, 200),
          cpu: {
            start_time: new Date(Date.now() - randInt(3600000, 86400000 * 30)).toISOString(),
            total: { value: randInt(100, 1e8) },
          },
          memory: {
            rss: { bytes: memRssBytes, pct: memRssPct },
            share: randInt(1e5, 1e7),
            size: memRssBytes + randInt(1e6, 1e8),
          },
          fd: {
            open: randInt(3, 500),
            limit: { soft: 1048576, hard: 1048576 },
          },
        },
      },
      user: { name: pick(['root', 'www-data', 'app', 'elastic-agent', 'postgres', 'redis']) },
    });
  }
  return docs;
};

// ---------------------------------------------------------------------------
// system.syslog — 500 docs
// ---------------------------------------------------------------------------

const SYSLOG_PROCESSES = [
  'systemd', 'sshd', 'cron', 'NetworkManager', 'thermald',
  'kernel', 'rsyslogd', 'dbus-daemon', 'polkitd', 'snapd',
];

const SYSLOG_MESSAGES = [
  'Started Session 42 of user root.',
  'Stopping User Slice of UID 1000.',
  'pam_unix(cron:session): session opened for user root by (uid=0)',
  'Connection closed by authenticating user admin 10.0.0.15 port 22',
  'constraint_0_power_limit_uw exceeded.',
  'Started CUPS Scheduler.',
  'Reloading.',
  'Startup finished in 3.456s.',
  'Listening on Journal Socket.',
  'Reached target Multi-User System.',
  'Started Daily apt download activities.',
  'New session c2 of user jdoe.',
  'WARNING: CPU frequency scaling not available.',
  'Memory cgroup out of memory: Killed process 12345.',
  'systemd-timesyncd.service: Succeeded.',
];

const generateSyslog = (): Record<string, unknown>[] => {
  const docs: Record<string, unknown>[] = [];
  for (let i = 0; i < 500; i++) {
    const hostIdx = i % HOSTNAMES.length;
    const procName = pick(SYSLOG_PROCESSES);
    const message = pick(SYSLOG_MESSAGES);

    docs.push({
      ...baseLogDoc(hostIdx, 'system.syslog'),
      message,
      process: { name: procName },
      log: {
        file: { path: '/var/log/syslog' },
        offset: randInt(0, 1e7),
      },
      system: { syslog: {} },
      tags: ['system-syslog'],
    });
  }
  return docs;
};

// ---------------------------------------------------------------------------
// system.auth — 750 docs
// Needs SSH events (Accepted/Failed/Invalid), useradd, and sudo sub-pools
// ---------------------------------------------------------------------------

const SSH_METHODS = ['password', 'publickey', 'keyboard-interactive'];
const GEO_COUNTRIES = ['US', 'DE', 'CN', 'RU', 'BR', 'IN', 'GB', 'FR', 'JP', 'AU'];
const GEO_LOCATIONS = [
  { lat: 37.77, lon: -122.42 }, { lat: 52.52, lon: 13.41 },
  { lat: 39.91, lon: 116.40 }, { lat: 55.75, lon: 37.62 },
  { lat: -23.55, lon: -46.63 }, { lat: 28.61, lon: 77.21 },
  { lat: 51.51, lon: -0.13 }, { lat: 48.86, lon: 2.35 },
  { lat: 35.68, lon: 139.69 }, { lat: -33.87, lon: 151.21 },
];

const SUDO_COMMANDS = [
  '/usr/bin/apt update', '/usr/bin/systemctl restart nginx',
  '/usr/bin/docker ps', '/usr/sbin/reboot',
  '/usr/bin/journalctl -u elastic-agent',
  '/usr/bin/cat /etc/shadow', '/usr/bin/rm -rf /tmp/cache',
];

const SHELLS = ['/bin/bash', '/bin/sh', '/usr/sbin/nologin', '/bin/zsh'];
const HOME_DIRS = ['/home/newuser1', '/home/deploy', '/home/svc-monitor', '/home/testuser'];

const generateAuth = (): Record<string, unknown>[] => {
  const docs: Record<string, unknown>[] = [];

  // ~400 SSH events
  for (let i = 0; i < 400; i++) {
    const hostIdx = i % HOSTNAMES.length;
    const sshEvent = pick(['Accepted', 'Accepted', 'Accepted', 'Failed', 'Failed', 'Invalid']);
    const geoIdx = randInt(0, GEO_COUNTRIES.length - 1);
    const userName = pick(['admin', 'jdoe', 'alice', 'bob', 'root', 'deploy', 'svc-app']);

    docs.push({
      ...baseLogDoc(hostIdx, 'system.auth'),
      message: `${sshEvent} ${pick(SSH_METHODS)} for ${userName} from ${pick(SOURCE_IPS)} port ${randInt(1024, 65535)} ssh2`,
      user: { name: userName },
      source: {
        ip: pick(SOURCE_IPS),
        geo: {
          country_iso_code: GEO_COUNTRIES[geoIdx],
          location: GEO_LOCATIONS[geoIdx],
        },
      },
      system: {
        auth: {
          ssh: {
            event: sshEvent,
            method: pick(SSH_METHODS),
          },
        },
      },
      log: {
        file: { path: '/var/log/auth.log' },
        offset: randInt(0, 1e7),
        syslog: {
          appname: 'sshd',
          facility: { code: 10, name: 'security/authorization' },
          hostname: HOSTNAMES[hostIdx],
          priority: 38,
          severity: { code: 6, name: 'Informational' },
        },
      },
      tags: ['system-auth'],
      related: { hosts: [HOSTNAMES[hostIdx]], user: [userName] },
    });
  }

  // ~200 sudo events
  for (let i = 0; i < 200; i++) {
    const hostIdx = i % HOSTNAMES.length;
    const userName = pick(['admin', 'jdoe', 'alice', 'deploy']);
    const hasError = Math.random() < 0.2;

    const authField: Record<string, unknown> = {
      sudo: {
        command: pick(SUDO_COMMANDS),
        ...(hasError ? { error: pick(['user NOT in sudoers', '3 incorrect password attempts', 'command not allowed']) } : {}),
      },
    };

    docs.push({
      ...baseLogDoc(hostIdx, 'system.auth'),
      message: `${userName} : TTY=pts/0 ; PWD=/home/${userName} ; COMMAND=${authField.sudo && (authField.sudo as any).command}`,
      user: { name: userName },
      system: { auth: authField },
      log: {
        file: { path: '/var/log/auth.log' },
        offset: randInt(0, 1e7),
        syslog: {
          appname: 'sudo',
          facility: { code: 10, name: 'security/authorization' },
          hostname: HOSTNAMES[hostIdx],
          priority: 38,
          severity: { code: hasError ? 4 : 6, name: hasError ? 'Warning' : 'Informational' },
        },
      },
      tags: ['system-auth'],
    });
  }

  // ~150 useradd / groupadd events
  for (let i = 0; i < 150; i++) {
    const hostIdx = i % HOSTNAMES.length;
    const isGroupAdd = i % 3 === 0;
    const userName = `user-${randInt(100, 999)}`;
    const groupName = `group-${randInt(100, 999)}`;

    if (isGroupAdd) {
      docs.push({
        ...baseLogDoc(hostIdx, 'system.auth'),
        message: `new group: name=${groupName}, GID=${randInt(1000, 65000)}`,
        group: { id: String(randInt(1000, 65000)), name: groupName },
        system: { auth: {} },
        log: {
          file: { path: '/var/log/auth.log' },
          offset: randInt(0, 1e7),
          syslog: {
            appname: 'groupadd',
            facility: { code: 10, name: 'security/authorization' },
            hostname: HOSTNAMES[hostIdx],
            priority: 38,
            severity: { code: 6, name: 'Informational' },
          },
        },
        tags: ['system-auth'],
      });
    } else {
      docs.push({
        ...baseLogDoc(hostIdx, 'system.auth'),
        message: `new user: name=${userName}, UID=${randInt(1000, 65000)}, GID=${randInt(1000, 65000)}, home=${pick(HOME_DIRS)}, shell=${pick(SHELLS)}`,
        user: { name: userName, id: String(randInt(1000, 65000)) },
        group: { id: String(randInt(1000, 65000)), name: groupName },
        system: {
          auth: {
            useradd: {
              home: pick(HOME_DIRS),
              shell: pick(SHELLS),
            },
          },
        },
        log: {
          file: { path: '/var/log/auth.log' },
          offset: randInt(0, 1e7),
          syslog: {
            appname: 'useradd',
            facility: { code: 10, name: 'security/authorization' },
            hostname: HOSTNAMES[hostIdx],
            priority: 38,
            severity: { code: 6, name: 'Informational' },
          },
        },
        tags: ['system-auth'],
      });
    }
  }

  return docs;
};

// ---------------------------------------------------------------------------
// system.security — 1000 docs
// Windows Security events with many event.code variants
// ---------------------------------------------------------------------------

interface SecurityEventTemplate {
  code: string;
  action: string;
  category: string[];
  type: string[];
  outcome: string;
  extraFields: () => Record<string, unknown>;
}

const WINDOWS_HOSTNAMES = [
  'WIN-DC01.corp.local',
  'WIN-SRV02.corp.local',
  'WIN-WKS03.corp.local',
  'WIN-APP04.corp.local',
  'WIN-DB05.corp.local',
];

const WINDOWS_USERS = ['Administrator', 'jsmith', 'svc-backup', 'SYSTEM', 'alice.jones', 'bob.chen'];
const WINDOWS_DOMAINS = ['CORP', 'corp.local', 'BUILTIN', 'NT AUTHORITY'];

const LOGON_TYPES = ['Interactive', 'Network', 'Batch', 'Service', 'RemoteInteractive', 'CachedInteractive'];

const SECURITY_TEMPLATES: SecurityEventTemplate[] = [
  // Logon success (4624)
  {
    code: '4624', action: 'logged-in', category: ['authentication'], type: ['start'],
    outcome: 'success',
    extraFields: () => ({
      winlog: {
        logon: { type: pick(LOGON_TYPES), id: `0x${randInt(10000, 99999).toString(16)}` },
        event_data: { SubjectUserName: pick(WINDOWS_USERS), TargetUserName: pick(WINDOWS_USERS) },
        process: { pid: randInt(500, 5000), thread: { id: randInt(1000, 9000) } },
      },
      user: { target: { name: pick(WINDOWS_USERS), domain: pick(WINDOWS_DOMAINS) } },
      source: { ip: randIp(), domain: pick(WINDOWS_DOMAINS) },
    }),
  },
  // Logon failure (4625)
  {
    code: '4625', action: 'logon-failed', category: ['authentication'], type: ['start'],
    outcome: 'failure',
    extraFields: () => ({
      winlog: {
        logon: { type: pick(LOGON_TYPES) },
        event_data: { SubjectUserName: pick(WINDOWS_USERS), TargetUserName: pick(WINDOWS_USERS) },
      },
      source: { ip: randIp(), domain: pick(WINDOWS_DOMAINS) },
    }),
  },
  // Special privileges (4672)
  {
    code: '4672', action: 'logged-in-special', category: ['authentication'], type: ['info'],
    outcome: 'success',
    extraFields: () => ({
      winlog: {
        logon: { id: `0x${randInt(10000, 99999).toString(16)}` },
        event_data: { SubjectUserName: pick(WINDOWS_USERS), PrivilegeList: 'SeSecurityPrivilege\n\t\tSeTakeOwnershipPrivilege' },
        process: { pid: randInt(500, 5000), thread: { id: randInt(1000, 9000) } },
      },
    }),
  },
  // User created (4720)
  {
    code: '4720', action: 'added-user-account', category: ['iam'], type: ['user', 'creation'],
    outcome: 'success',
    extraFields: () => ({
      winlog: {
        logon: { id: `0x${randInt(10000, 99999).toString(16)}` },
        event_data: { SubjectUserName: pick(WINDOWS_USERS), TargetUserName: `newuser-${randInt(1, 50)}`, OldTargetUserName: '' },
      },
    }),
  },
  // User disabled (4725)
  {
    code: '4725', action: 'disabled-user-account', category: ['iam'], type: ['user', 'change'],
    outcome: 'success',
    extraFields: () => ({
      winlog: {
        event_data: { SubjectUserName: 'Administrator', TargetUserName: pick(WINDOWS_USERS) },
      },
    }),
  },
  // User deleted (4726)
  {
    code: '4726', action: 'deleted-user-account', category: ['iam'], type: ['user', 'deletion'],
    outcome: 'success',
    extraFields: () => ({
      winlog: {
        event_data: { SubjectUserName: 'Administrator', TargetUserName: `user-${randInt(1, 50)}` },
      },
    }),
  },
  // Account locked (4740)
  {
    code: '4740', action: 'locked-out', category: ['iam'], type: ['user', 'change'],
    outcome: 'success',
    extraFields: () => ({
      winlog: {
        event_data: { SubjectUserName: pick(WINDOWS_USERS), TargetUserName: pick(WINDOWS_USERS), Workstation: pick(WINDOWS_HOSTNAMES) },
      },
    }),
  },
  // User enabled (4722)
  {
    code: '4722', action: 'enabled-user-account', category: ['iam'], type: ['user', 'change'],
    outcome: 'success',
    extraFields: () => ({
      winlog: { event_data: { SubjectUserName: 'Administrator', TargetUserName: pick(WINDOWS_USERS) } },
    }),
  },
  // User changed (4738)
  {
    code: '4738', action: 'changed-user-account', category: ['iam'], type: ['user', 'change'],
    outcome: 'success',
    extraFields: () => ({
      winlog: { event_data: { SubjectUserName: 'Administrator', TargetUserName: pick(WINDOWS_USERS) } },
    }),
  },
  // Explicit cred logon (4648)
  {
    code: '4648', action: 'logged-in-explicit', category: ['authentication'], type: ['start'],
    outcome: 'success',
    extraFields: () => ({
      winlog: {
        logon: { type: 'NewCredentials', id: `0x${randInt(10000, 99999).toString(16)}` },
        event_data: { SubjectUserName: pick(WINDOWS_USERS), TargetUserName: pick(WINDOWS_USERS) },
      },
      source: { ip: randIp(), domain: pick(WINDOWS_DOMAINS) },
    }),
  },
  // Group membership (4627)
  {
    code: '4627', action: 'group-membership-evaluated', category: ['iam'], type: ['info'],
    outcome: 'success',
    extraFields: () => ({
      user: { target: { name: pick(WINDOWS_USERS), domain: 'CORP' } },
      winlog: { logon: { type: pick(LOGON_TYPES) } },
    }),
  },
  // Workstation locked/unlocked (4800/4801)
  ...(['4800', '4801'] as const).map((code) => ({
    code,
    action: code === '4800' ? 'workstation-locked' : 'workstation-unlocked',
    category: ['session'] as string[],
    type: ['info'] as string[],
    outcome: 'success' as const,
    extraFields: () => ({
      winlog: { logon: { id: `0x${randInt(10000, 99999).toString(16)}` } },
    }),
  })),
  // Trust direction (4675)
  {
    code: '4675', action: 'trust-direction', category: ['iam'], type: ['info'],
    outcome: 'success',
    extraFields: () => ({
      winlog: { trustDirection: pick(['Inbound', 'Outbound', 'Bidirectional']) },
    }),
  },
  // Group created (4731)
  {
    code: '4731', action: 'added-local-group', category: ['iam'], type: ['group', 'creation'],
    outcome: 'success',
    extraFields: () => ({
      group: { name: `LocalGroup-${randInt(1, 20)}`, domain: 'BUILTIN' },
      winlog: {
        logon: { id: `0x${randInt(10000, 99999).toString(16)}` },
        event_data: { SubjectUserName: pick(WINDOWS_USERS), MemberName: pick(WINDOWS_USERS) },
      },
    }),
  },
  // Member added to group (4732)
  {
    code: '4732', action: 'added-member-to-local-group', category: ['iam'], type: ['group', 'change'],
    outcome: 'success',
    extraFields: () => ({
      group: { name: `LocalGroup-${randInt(1, 20)}`, domain: 'BUILTIN' },
      winlog: {
        event_data: { SubjectUserName: pick(WINDOWS_USERS), MemberName: `CN=${pick(WINDOWS_USERS)},OU=Users,DC=corp,DC=local` },
      },
    }),
  },
  // Member removed from group (4733)
  {
    code: '4733', action: 'removed-member-from-local-group', category: ['iam'], type: ['group', 'change'],
    outcome: 'success',
    extraFields: () => ({
      group: { name: `LocalGroup-${randInt(1, 20)}`, domain: 'BUILTIN' },
      winlog: {
        event_data: { SubjectUserName: pick(WINDOWS_USERS), MemberName: `CN=${pick(WINDOWS_USERS)},OU=Users,DC=corp,DC=local` },
      },
    }),
  },
  // Global group created (4727)
  {
    code: '4727', action: 'added-global-group', category: ['iam'], type: ['group', 'creation'],
    outcome: 'success',
    extraFields: () => ({
      group: { name: `GlobalGroup-${randInt(1, 20)}`, domain: 'CORP' },
      winlog: { event_data: { SubjectUserName: pick(WINDOWS_USERS) } },
    }),
  },
  // Directory service access (4662)
  {
    code: '4662', action: 'directory-service-access', category: ['iam'], type: ['access'],
    outcome: 'success',
    extraFields: () => ({
      winlog: {
        event_data: {
          ObjectName: `CN=${pick(WINDOWS_USERS)},OU=Users,DC=corp,DC=local`,
          ObjectClass: pick(['user', 'group', 'computer', 'organizationalUnit']),
          OperationType: pick(['Object Access', 'Object Write', 'Object Delete']),
          AttributeLDAPDisplayName: pick(['member', 'userAccountControl', 'displayName', 'description']),
        },
      },
    }),
  },
  // DS replication (4931/4932/4933)
  ...(['4931', '4932', '4933'] as const).map((code) => ({
    code,
    action: `ds-replication-${code}`,
    category: ['iam'] as string[],
    type: ['info'] as string[],
    outcome: 'success' as const,
    extraFields: () => ({
      winlog: {
        event_data: {
          Options: `0x${randInt(0, 255).toString(16)}`,
          StatusCode: '0',
          StatusDescription: 'Success',
        },
      },
    }),
  })),
  // LDAP modify (5136)
  {
    code: '5136', action: 'modified-directory-service-object', category: ['iam'], type: ['change'],
    outcome: 'success',
    extraFields: () => ({
      winlog: {
        event_data: {
          ObjectName: `CN=${pick(WINDOWS_USERS)},OU=Users,DC=corp,DC=local`,
          ObjectClass: 'user',
          AttributeLDAPDisplayName: pick(['description', 'memberOf', 'userAccountControl']),
          OperationType: '%%14674',
        },
      },
    }),
  },
  // Crypto operations (5058/5059/5061)
  ...(['5058', '5059', '5061'] as const).map((code) => ({
    code,
    action: `crypto-operation-${code}`,
    category: ['process'] as string[],
    type: ['info'] as string[],
    outcome: 'success' as const,
    extraFields: () => ({
      winlog: {
        event_data: {
          Operation: pick(['Open Key', 'Read Persisted Key', 'Key Access']),
          ClassName: pick(['Microsoft Software Key Storage Provider', 'Microsoft Platform Crypto Provider']),
        },
      },
    }),
  })),
  // Code integrity (5038)
  {
    code: '5038', action: 'code-integrity', category: ['process'], type: ['info'],
    outcome: 'failure',
    extraFields: () => ({
      file: { path: `C:\\Windows\\System32\\${pick(['ntdll.dll', 'kernel32.dll', 'svchost.exe'])}` },
    }),
  },
  // Credential backup (4695)
  {
    code: '4695', action: 'credential-backup', category: ['iam'], type: ['info'],
    outcome: 'success',
    extraFields: () => ({}),
  },
  // Device event (6416)
  {
    code: '6416', action: 'new-device-recognized', category: ['host'], type: ['info'],
    outcome: 'success',
    extraFields: () => ({
      winlog: {
        event_data: {
          LocationInformation: pick(['Port_#0001.Hub_#0001', 'Port_#0003.Hub_#0002']),
          ClassName: pick(['DiskDrive', 'USB', 'Net']),
        },
      },
    }),
  },
  // Rename user (4781)
  {
    code: '4781', action: 'user-account-renamed', category: ['iam'], type: ['user', 'change'],
    outcome: 'success',
    extraFields: () => ({
      winlog: {
        event_data: { SubjectUserName: 'Administrator', TargetUserName: pick(WINDOWS_USERS), OldTargetUserName: `old-${pick(WINDOWS_USERS)}` },
      },
    }),
  },
  // User unlocked (4767)
  {
    code: '4767', action: 'user-account-unlocked', category: ['iam'], type: ['user', 'change'],
    outcome: 'success',
    extraFields: () => ({
      winlog: { event_data: { SubjectUserName: 'Administrator', TargetUserName: pick(WINDOWS_USERS) } },
    }),
  },
  // RDP connect/disconnect (4778/4779)
  ...(['4778', '4779'] as const).map((code) => ({
    code,
    action: code === '4778' ? 'session-reconnected' : 'session-disconnected',
    category: ['session'] as string[],
    type: [code === '4778' ? 'start' : 'end'] as string[],
    outcome: 'success' as const,
    extraFields: () => ({
      source: { ip: randIp() },
      winlog: {
        logon: { type: 'RemoteInteractive', id: `0x${randInt(10000, 99999).toString(16)}` },
      },
    }),
  })),
  // DPAPI key accessed (4692)
  {
    code: '4692', action: 'dpapi-backup', category: ['iam'], type: ['info'],
    outcome: 'success',
    extraFields: () => ({}),
  },
  // Firewall / policy events (5447, 5449, 4945, 5446, 5441, 4953, 4957, 4962, 4963, 4965)
  ...(['5447', '5449', '4945', '5446', '5441', '4953', '4957'] as const).map((code) => ({
    code,
    action: `firewall-policy-${code}`,
    category: ['network'] as string[],
    type: ['info'] as string[],
    outcome: 'success' as const,
    extraFields: () => ({
      winlog: {
        event_data: {
          FilterName: `Filter-${randInt(1, 100)}`,
          ChangeType: pick(['added', 'deleted', 'modified']),
          ProfileUsed: pick(['Domain', 'Private', 'Public']),
        },
      },
      rule: { name: `Rule-${randInt(1, 50)}`, id: `{${randInt(10000000, 99999999)}-0000-0000-0000-${randInt(100000000000, 999999999999)}}` },
    }),
  })),
  // Object access (4663)
  {
    code: '4663', action: 'object-access', category: ['file'], type: ['access'],
    outcome: 'success',
    extraFields: () => ({
      file: { path: `C:\\Sensitive\\${pick(['report.docx', 'data.xlsx', 'config.ini'])}` },
      process: { executable: `C:\\Windows\\System32\\${pick(['cmd.exe', 'powershell.exe', 'explorer.exe'])}`, pid: randInt(1000, 30000) },
      winlog: {
        event_data: {
          ObjectName: `C:\\Sensitive\\file-${randInt(1, 20)}.txt`,
          ObjectType: 'File',
          ObjectServer: 'Security',
        },
      },
    }),
  },
  // Handle closed (4658)
  {
    code: '4658', action: 'handle-closed', category: ['file'], type: ['end'],
    outcome: 'success',
    extraFields: () => ({
      process: { pid: randInt(1000, 30000) },
      winlog: {
        event_data: {
          ObjectServer: 'Security',
          TargetProcessId: String(randInt(1000, 30000)),
          SourceProcessId: String(randInt(1000, 30000)),
        },
      },
    }),
  },
  // Privilege use (4876, 4690, 4691, 4664)
  ...(['4876', '4690', '4691', '4664'] as const).map((code) => ({
    code,
    action: `privilege-use-${code}`,
    category: ['iam'] as string[],
    type: ['info'] as string[],
    outcome: 'success' as const,
    extraFields: () => ({
      winlog: {
        event_data: {
          PrivilegeList: pick(['SeBackupPrivilege', 'SeRestorePrivilege', 'SeSecurityPrivilege']),
          FailureReasonsOutcome: 'Success',
        },
      },
    }),
  })),
  // Kerberos (4793)
  {
    code: '4793', action: 'password-policy-check', category: ['iam'], type: ['info'],
    outcome: 'success',
    extraFields: () => ({
      winlog: {
        event_data: {
          Workstation: pick(WINDOWS_HOSTNAMES),
          StatusCode: '0x0',
          StatusDescription: 'Success',
        },
      },
    }),
  },
  // Group query (4799)
  {
    code: '4799', action: 'group-membership-enumerated', category: ['iam'], type: ['info'],
    outcome: 'success',
    extraFields: () => ({
      group: { name: pick(['Administrators', 'Remote Desktop Users', 'Backup Operators']), domain: 'BUILTIN' },
      winlog: { event_data: { SubjectUserName: pick(WINDOWS_USERS) } },
    }),
  },
];

const generateSecurity = (): Record<string, unknown>[] => {
  const docs: Record<string, unknown>[] = [];

  for (let i = 0; i < 1000; i++) {
    const template = SECURITY_TEMPLATES[i % SECURITY_TEMPLATES.length];
    const hostIdx = i % WINDOWS_HOSTNAMES.length;
    const hostName = WINDOWS_HOSTNAMES[hostIdx];
    const extra = template.extraFields();

    const winlogBase = {
      channel: 'Security',
      computer_name: hostName,
      event_id: template.code,
      keywords: [template.outcome === 'success' ? 'Audit Success' : 'Audit Failure'],
      level: 'information',
      opcode: 'Info',
      outcome: template.outcome,
      provider_guid: '{54849625-5478-4994-a5ba-3e3b0328c30d}',
      provider_name: 'Microsoft-Windows-Security-Auditing',
      record_id: String(randInt(10000, 99999)),
    };

    const mergedWinlog = { ...winlogBase, ...(extra.winlog as Record<string, unknown> ?? {}) };

    const doc: Record<string, unknown> = {
      agent: {
        id: `agent-win-${hostIdx}`,
        type: 'filebeat',
        version: '8.18.0',
        ephemeral_id: `eph-win-${randInt(1000, 9999)}`,
        name: hostName,
      },
      host: { name: hostName },
      ecs: { version: '8.11.0' },
      event: {
        module: 'system',
        dataset: 'system.security',
        kind: 'event',
        action: template.action,
        category: template.category,
        code: template.code,
        outcome: template.outcome,
        type: template.type,
        provider: 'Microsoft-Windows-Security-Auditing',
      },
      input: { type: 'httpjson' },
      log: { level: 'information' },
      winlog: mergedWinlog,
      user: {
        name: pick(WINDOWS_USERS),
        domain: pick(WINDOWS_DOMAINS),
        id: `S-1-5-21-${randInt(100000000, 999999999)}-${randInt(1000, 9999)}`,
        ...(extra.user as Record<string, unknown> ?? {}),
      },
      tags: ['forwarded'],
    };

    if (extra.source) doc.source = extra.source;
    if (extra.group) doc.group = extra.group;
    if (extra.file) doc.file = extra.file;
    if (extra.process) doc.process = extra.process;
    if (extra.rule) doc.rule = extra.rule;
    if ((extra.user as Record<string, unknown> | undefined)?.target) {
      (doc.user as Record<string, unknown>).target = (extra.user as Record<string, unknown>).target;
    }
    if (extra.related) doc.related = extra.related;

    docs.push(doc);
  }
  return docs;
};

// ---------------------------------------------------------------------------
// system.application — 500 docs (Windows Overview dashboard)
// ---------------------------------------------------------------------------

const APP_PROVIDERS = [
  'Microsoft-Windows-Security-SPP',
  'Application Error',
  'Windows Error Reporting',
  'ESENT',
  'MsiInstaller',
  '.NET Runtime',
  'VSS',
  'Software Protection Platform Service',
];
const APP_EVENT_IDS = ['1000', '1001', '1002', '8198', '11707', '11724', '903', '8193'];
const LOG_LEVELS = ['information', 'warning', 'error', 'information', 'information'];

const generateApplication = (): Record<string, unknown>[] => {
  const docs: Record<string, unknown>[] = [];
  for (let i = 0; i < 500; i++) {
    const hostIdx = i % WINDOWS_HOSTNAMES.length;
    const hostName = WINDOWS_HOSTNAMES[hostIdx];

    docs.push({
      agent: {
        id: `agent-win-${hostIdx}`,
        type: 'filebeat',
        version: '8.18.0',
        name: hostName,
      },
      host: { name: hostName },
      ecs: { version: '8.11.0' },
      event: {
        module: 'system',
        dataset: 'system.application',
        kind: 'event',
      },
      input: { type: 'httpjson' },
      log: { level: pick(LOG_LEVELS) },
      winlog: {
        channel: 'Application',
        provider_name: pick(APP_PROVIDERS),
        event_id: pick(APP_EVENT_IDS),
        computer_name: hostName,
        record_id: String(randInt(10000, 99999)),
        level: pick(LOG_LEVELS),
        keywords: ['Classic'],
        opcode: 'Info',
      },
      tags: ['forwarded'],
    });
  }
  return docs;
};

// ---------------------------------------------------------------------------
// system.system — 500 docs (Windows Overview dashboard)
// ---------------------------------------------------------------------------

const SYS_PROVIDERS = [
  'Service Control Manager',
  'Microsoft-Windows-Kernel-General',
  'Microsoft-Windows-Kernel-Power',
  'Microsoft-Windows-FilterManager',
  'Microsoft-Windows-DNS-Client',
  'Microsoft-Windows-Time-Service',
  'EventLog',
  'volmgr',
];
const SYS_EVENT_IDS = ['7036', '7040', '7045', '12', '13', '41', '1', '6013'];

const generateSystem = (): Record<string, unknown>[] => {
  const docs: Record<string, unknown>[] = [];
  for (let i = 0; i < 500; i++) {
    const hostIdx = i % WINDOWS_HOSTNAMES.length;
    const hostName = WINDOWS_HOSTNAMES[hostIdx];

    docs.push({
      agent: {
        id: `agent-win-${hostIdx}`,
        type: 'filebeat',
        version: '8.18.0',
        name: hostName,
      },
      host: { name: hostName },
      ecs: { version: '8.11.0' },
      event: {
        module: 'system',
        dataset: 'system.system',
        kind: 'event',
      },
      input: { type: 'httpjson' },
      log: { level: pick(LOG_LEVELS) },
      winlog: {
        channel: 'System',
        provider_name: pick(SYS_PROVIDERS),
        event_id: pick(SYS_EVENT_IDS),
        computer_name: hostName,
        record_id: String(randInt(10000, 99999)),
        level: pick(LOG_LEVELS),
        keywords: ['Classic'],
        opcode: 'Info',
      },
      tags: ['forwarded'],
    });
  }
  return docs;
};

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

const main = () => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Generating system package sample data -> ${OUTPUT_DIR}\n`);

  writeDataset('system.cpu', generateCpu());
  writeDataset('system.memory', generateMemory());
  writeDataset('system.fsstat', generateFsstat());
  writeDataset('system.filesystem', generateFilesystem());
  writeDataset('system.network', generateNetwork());
  writeDataset('system.load', generateLoad());
  writeDataset('system.diskio', generateDiskio());
  writeDataset('system.process', generateProcess());
  writeDataset('system.syslog', generateSyslog());
  writeDataset('system.auth', generateAuth());
  writeDataset('system.security', generateSecurity());
  writeDataset('system.application', generateApplication());
  writeDataset('system.system', generateSystem());

  console.log('\nDone!');
};

main();
