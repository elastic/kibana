/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import { runScoutHook } from './scout_hook';

describe('runScoutHook', () => {
  let repoRoot: string;

  const writeHook = (body: string) => {
    Fs.writeFileSync(Path.join(repoRoot, 'hook.sh'), body);
    return 'hook.sh';
  };

  beforeEach(() => {
    repoRoot = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'kbn-evals-scout-hook-'));
  });

  afterEach(() => {
    Fs.rmSync(repoRoot, { recursive: true, force: true });
  });

  it('passes the config on stdin and returns the env it prints', () => {
    const hook = writeHook(`cat > stdin.json; echo '{"env":{"A":"1","B":""}}'`);
    expect(runScoutHook(repoRoot, hook, { value: 'from-config' })).toEqual({ A: '1', B: '' });
    expect(JSON.parse(Fs.readFileSync(Path.join(repoRoot, 'stdin.json'), 'utf8'))).toEqual({
      value: 'from-config',
    });
  });

  it('returns nothing when the hook adds nothing', () => {
    expect(runScoutHook(repoRoot, writeHook(`echo '{}'`), {})).toEqual({});
  });

  it('returns the env of a hook that exits before the config is written to its stdin', () => {
    const hook = writeHook(`echo '{"env":{"A":"1"}}'`);
    const config = { pad: 'x'.repeat(1024 * 1024) };
    expect(runScoutHook(repoRoot, hook, config)).toEqual({ A: '1' });
  });

  it('fails when the hook exits non-zero', () => {
    expect(() => runScoutHook(repoRoot, writeHook('exit 3'), {})).toThrow('exited with code 3');
  });

  it('fails when the hook prints something other than the expected shape', () => {
    expect(() => runScoutHook(repoRoot, writeHook(`echo nope`), {})).toThrow('did not print JSON');
    expect(() => runScoutHook(repoRoot, writeHook(`echo '{"env":{"A":1}}'`), {})).toThrow(
      'must print'
    );
  });

  it.each(['[]', '5', '"ok"', 'null', '{"env":[]}', '{"env":null}', '{"unexpected":{}}'])(
    'rejects %s instead of treating it as "no env"',
    (output) => {
      expect(() => runScoutHook(repoRoot, writeHook(`echo '${output}'`), {})).toThrow('must print');
    }
  );
});
