/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { closeSync, openSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

interface Project {
  name: string;
  id: string;
  environment: string;
  credentials: { api_key: string };
  kibana: { url: string };
  elasticsearch: { url: string };
}
const root = process.cwd();
assert.equal(root, '/Users/jloleysens/repos/work/kibana-t1-isolated-tasks');
const projectName = process.env.WIR_QAF_PROJECT;
assert.ok(projectName === 'wir-shared-baseline-1019c' || projectName === 'wir-t1-exp-1019');
const baseline = projectName === 'wir-shared-baseline-1019c';
const evidence = process.env.WIR_EVIDENCE_DIR;
const digest = process.env.WIR_IMAGE_DIGEST;
const expectedBuild = process.env.WIR_EXPECTED_BUILD_SHA;
assert.ok(evidence && digest && expectedBuild);
const describe = spawnSync(
  'qaf',
  ['elastic-cloud', 'projects', 'describe', projectName, '--as-json', '--show-credentials'],
  { cwd: '/Users/jloleysens/repos/work/qaf', encoding: 'utf8', timeout: 90000 }
);
assert.equal(describe.status, 0, 'QAF describe failed; credential output deliberately not logged');
const project = JSON.parse(describe.stdout) as Project;
assert.equal(project.name, projectName);
assert.equal(project.environment, 'qa');
assert.ok(project.credentials.api_key);
const infoResponse = await fetch(
  `${project.kibana.url}/internal/workload_isolation_research/info`,
  {
    headers: {
      authorization: `ApiKey ${project.credentials.api_key}`,
      'kbn-xsrf': 'research',
      'x-elastic-internal-origin': 'kibana',
      'elastic-api-version': '1',
    },
  }
);
assert.equal(infoResponse.status, 200);
const info = (await infoResponse.json()) as {
  build_sha: string;
  node_roles: object;
  pod: string;
  boot_id: string;
};
assert.ok(info.build_sha.startsWith(expectedBuild), 'Unexpected live image build SHA');
writeFileSync(
  join(evidence, `${projectName}_live_identity.json`),
  JSON.stringify(
    {
      project_id: project.id,
      project_name: projectName,
      digest,
      live: info,
      utc: new Date().toISOString(),
    },
    null,
    2
  )
);
const scenarios = baseline
  ? ['t1-task-curve-main']
  : ['t1-task-curve-thread', 't1-worker-supervised', 't1-field-caps-bytes'];
const resources: Array<{ pid: number; scenario: string; stopped: boolean }> = [];
const remoteCleanup: Array<{ endpoint: string; status: number }> = [];
const controller = new AbortController();
process.once('SIGTERM', () => controller.abort());
process.once('SIGINT', () => controller.abort());
const checkpoint = (): void =>
  writeFileSync(
    join(evidence, `${projectName}_driver_resources.json`),
    JSON.stringify(
      { owner_pid: process.pid, project_id: project.id, resources, remote_cleanup: remoteCleanup },
      null,
      2
    )
  );
try {
  for (const scenario of scenarios) {
    const fd = openSync(join(evidence, `${projectName}_${scenario}_driver.log`), 'w', 0o600);
    const child: ChildProcess = spawn(
      process.execPath,
      [
        'x-pack/platform/plugins/private/workload_isolation_research/harness/run.js',
        'run',
        '--scenario',
        scenario,
        '--lane',
        'track-1',
        '--variant',
        baseline ? 'qaf-control' : 'qaf-isolated',
        '--target',
        'qaf',
        '--qaf-project-id',
        project.id,
        '--image-digest',
        digest,
        '--baseline-commit',
        '6e854e8b8dce1b62b310b2ca9600ee3b7118ed7a',
        '--hypothesis',
        'Split-role UI already protected; background task control gaps improve under worker task doses, not capacity starvation.',
        '--expected',
        JSON.stringify({
          primary: 'p95',
          ui_probe_p95_ratio_max: 2,
          control_bg_gap_at_10s_ms_min: 9000,
          isolated_bg_gap_at_10s_ms_max: 1000,
          p99_inference: false,
          paired_per_arm: 1,
          slice_50ms_claim: false,
          field_caps_bytes_off_main: true,
        }),
      ],
      {
        cwd: root,
        detached: true,
        stdio: ['ignore', fd, fd],
        env: {
          ...process.env,
          WIR_KIBANA_URL: project.kibana.url,
          WIR_KIBANA_API_KEY: project.credentials.api_key,
          WIR_ES_URL: project.elasticsearch.url,
          WIR_ES_API_KEY: project.credentials.api_key,
        },
      }
    );
    closeSync(fd);
    assert.ok(child.pid);
    const resource = { pid: child.pid, scenario, stopped: false };
    resources.push(resource);
    checkpoint();
    const [exit]: [number | null, NodeJS.Signals | null] = (await once(child, 'exit', {
      signal: controller.signal,
    })) as [number | null, NodeJS.Signals | null];
    resource.stopped = true;
    checkpoint();
    assert.equal(exit, 0, 'Driver failed; inspect raw manifest and never accept INVALID');
  }
} finally {
  for (const resource of resources) {
    if (!resource.stopped) {
      const alive = (): boolean => {
        try {
          process.kill(-resource.pid, 0);
          return true;
        } catch {
          return false;
        }
      };
      if (alive()) process.kill(-resource.pid, 'SIGTERM');
      for (let attempt = 0; attempt < 100 && alive(); attempt++) await delay(100);
      if (alive()) process.kill(-resource.pid, 'SIGKILL');
      for (let attempt = 0; attempt < 30 && alive(); attempt++) await delay(100);
      resource.stopped = !alive();
    }
  }
  if (controller.signal.aborted) {
    for (const endpoint of [
      'ticks/_stop',
      'probe/_stop',
      'probe/_stop',
      'probe/_stop',
      'probe/_stop',
    ]) {
      const response = await fetch(
        `${project.kibana.url}/internal/workload_isolation_research/${endpoint}`,
        {
          method: 'POST',
          headers: {
            authorization: `ApiKey ${project.credentials.api_key}`,
            'kbn-xsrf': 'research',
            'x-elastic-internal-origin': 'kibana',
            'elastic-api-version': '1',
          },
          signal: AbortSignal.timeout(30000),
        }
      ).catch(() => undefined);
      remoteCleanup.push({ endpoint, status: response?.status ?? 0 });
    }
  }
  checkpoint();
}
