/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { accountFromFiles, parseKeyValue, podName, readBootId } from './cgroup_sample';

test('a missing cgroup file stays null and a present zero stays zero', () => {
  const account = accountFromFiles(() => null);
  assert.equal(account.current, null);
  assert.equal(account.anon, null);
  assert.equal(account.inactiveFile, null);
  assert.equal(account.oom, null);
  assert.equal(account.oomKill, null);
  assert.equal(account.workingSet, null);
  assert.equal(account.peak, null);

  const zero = accountFromFiles((file) => {
    if (file.endsWith('memory.current')) return '0\n';
    if (file.endsWith('memory.stat')) return 'anon 0\ninactive_file 0\n';
    if (file.endsWith('memory.events')) return 'oom 0\noom_kill 0\n';
    if (file.endsWith('memory.peak')) return '0\n';
    return null;
  });
  assert.equal(zero.current, 0);
  assert.equal(zero.anon, 0);
  assert.equal(zero.workingSet, 0);
  assert.equal(zero.oomKill, 0);
});

test('working set subtracts inactive file and ignores a non-numeric peak', () => {
  const account = accountFromFiles((file) => {
    if (file.endsWith('memory.current')) return '2147483648\n';
    if (file.endsWith('memory.stat')) {
      return 'anon 1600000000\nfile 400000000\ninactive_file 373000000\nshmem 0\n';
    }
    if (file.endsWith('memory.events')) return 'oom 1\noom_kill 1\n';
    if (file.endsWith('memory.peak')) return 'max\n';
    return null;
  });
  assert.equal(account.anon, 1600000000);
  assert.equal(account.file, 400000000);
  assert.equal(account.shmem, 0);
  assert.equal(account.workingSet, 2147483648 - 373000000);
  assert.equal(account.oom, 1);
  assert.equal(account.oomKill, 1);
  assert.equal(account.peak, null);
  assert.deepEqual(parseKeyValue('anon 5\nnot a line\n'), { anon: 5 });
});

test('boot id and pod name drop unexpected text', () => {
  assert.equal(readBootId('abc-123\n'), 'abc-123');
  assert.equal(readBootId('boot id: secret'), null);
  assert.equal(readBootId(null), null);
  assert.equal(podName('kb-background-tasks-abc'), 'kb-background-tasks-abc');
  assert.equal(podName('pod name\nwith spaces'), 'podnamewithspaces');
});
