/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// We must disable prototype hardening to test the pollution
process.env.KBN_UNSAFE_DISABLE_PROTOTYPE_HARDENING = 'true';

require('../../src/setup_node_env');

const cp = require('child_process');
const path = require('path');
const test = require('tape');

Object.prototype.POLLUTED = 'polluted!'; // eslint-disable-line no-extend-native

const notSet = [null, undefined];

test.onFinish(() => {
  delete Object.prototype.POLLUTED;
});

test('test setup ok', (t) => {
  t.equal({}.POLLUTED, 'polluted!');
  t.end();
});

const functions = ['exec', 'execFile', 'fork', 'spawn', 'execFileSync', 'execSync', 'spawnSync'];
for (const name of functions) {
  test(`${name}()`, (t) => {
    t.throws(() => cp[name](), /argument must be of type string/);
    t.end();
  });
}

{
  const command = 'echo $POLLUTED$custom';

  test('exec(command)', (t) => {
    assertProcess(t, cp.exec(command));
  });

  test('exec(command, callback)', (t) => {
    cp.exec(command, (err, stdout, stderr) => {
      t.error(err);
      t.equal(stdout.trim(), '');
      t.equal(stderr.trim(), '');
      t.end();
    });
  });

  test('exec(command, options)', (t) => {
    assertProcess(t, cp.exec(command, {}));
  });

  test('exec(command, options) - with custom env', (t) => {
    assertProcess(t, cp.exec(command, { env: { custom: 'custom' } }), { stdout: 'custom' });
  });

  test('exec(command, options, callback)', (t) => {
    cp.exec(command, {}, (err, stdout, stderr) => {
      t.error(err);
      t.equal(stdout.trim(), '');
      t.equal(stderr.trim(), '');
      t.end();
    });
  });

  test('exec(command, options, callback) - with custom env', (t) => {
    cp.exec(command, { env: { custom: 'custom' } }, (err, stdout, stderr) => {
      t.error(err);
      t.equal(stdout.trim(), 'custom');
      t.equal(stderr.trim(), '');
      t.end();
    });
  });

  for (const unset of notSet) {
    test(`exec(command, ${unset})`, (t) => {
      assertProcess(t, cp.exec(command, unset));
    });

    test(`exec(command, ${unset}, callback)`, (t) => {
      cp.exec(command, unset, (err, stdout, stderr) => {
        t.error(err);
        t.equal(stdout.trim(), '');
        t.equal(stderr.trim(), '');
        t.end();
      });
    });
  }
}

{
  const file = path.join('test', 'harden', '_echo.sh');

  test('execFile(file)', (t) => {
    assertProcess(t, cp.execFile(file));
  });

  test('execFile(file, args)', (t) => {
    assertProcess(t, cp.execFile(file, []));
  });

  test('execFile(file, callback)', (t) => {
    cp.execFile(file, (err, stdout, stderr) => {
      t.error(err);
      t.equal(stdout.trim(), '');
      t.equal(stderr.trim(), '');
      t.end();
    });
  });

  test('execFile(file, options)', (t) => {
    assertProcess(t, cp.execFile(file, {}));
  });

  test('execFile(file, options) - with custom env', (t) => {
    assertProcess(t, cp.execFile(file, { env: { custom: 'custom' } }), { stdout: 'custom' });
  });

  test('execFile(file, options, callback)', (t) => {
    cp.execFile(file, {}, (err, stdout, stderr) => {
      t.error(err);
      t.equal(stdout.trim(), '');
      t.equal(stderr.trim(), '');
      t.end();
    });
  });

  test('execFile(file, options, callback) - with custom env', (t) => {
    cp.execFile(file, { env: { custom: 'custom' } }, (err, stdout, stderr) => {
      t.error(err);
      t.equal(stdout.trim(), 'custom');
      t.equal(stderr.trim(), '');
      t.end();
    });
  });

  test('execFile(file, args, callback)', (t) => {
    cp.execFile(file, [], (err, stdout, stderr) => {
      t.error(err);
      t.equal(stdout.trim(), '');
      t.equal(stderr.trim(), '');
      t.end();
    });
  });

  test('execFile(file, args, options)', (t) => {
    assertProcess(t, cp.execFile(file, [], {}));
  });

  test('execFile(file, args, options) - with custom env', (t) => {
    assertProcess(t, cp.execFile(file, [], { env: { custom: 'custom' } }), { stdout: 'custom' });
  });

  test('execFile(file, args, options, callback)', (t) => {
    cp.execFile(file, [], {}, (err, stdout, stderr) => {
      t.error(err);
      t.equal(stdout.trim(), '');
      t.equal(stderr.trim(), '');
      t.end();
    });
  });

  test('execFile(file, args, options, callback) - with custom env', (t) => {
    cp.execFile(file, [], { env: { custom: 'custom' } }, (err, stdout, stderr) => {
      t.error(err);
      t.equal(stdout.trim(), 'custom');
      t.equal(stderr.trim(), '');
      t.end();
    });
  });

  for (const unset of notSet) {
    test(`execFile(file, ${unset})`, (t) => {
      assertProcess(t, cp.execFile(file, unset));
    });

    test(`execFile(file, ${unset}, ${unset})`, (t) => {
      assertProcess(t, cp.execFile(file, unset, unset));
    });

    test(`execFile(file, ${unset}, callback)`, (t) => {
      cp.execFile(file, unset, (err, stdout, stderr) => {
        t.error(err);
        t.equal(stdout.trim(), '');
        t.equal(stderr.trim(), '');
        t.end();
      });
    });

    test(`execFile(file, ${unset}, ${unset}, callback)`, (t) => {
      cp.execFile(file, unset, unset, (err, stdout, stderr) => {
        t.error(err);
        t.equal(stdout.trim(), '');
        t.equal(stderr.trim(), '');
        t.end();
      });
    });

    test(`execFile(file, ${unset}, options)`, (t) => {
      assertProcess(t, cp.execFile(file, unset, {}));
    });
  }
}

{
  const modulePath = path.join('test', 'harden', '_fork.js');

  // NOTE: Forked processes don't have any stdout we can monitor without providing options
  test.skip('fork(modulePath)', (t) => {
    assertProcess(t, cp.fork(modulePath));
  });

  // NOTE: Forked processes don't have any stdout we can monitor without providing options
  test.skip('execFile(file, args)', (t) => {
    assertProcess(t, cp.fork(modulePath, []));
  });

  test('fork(modulePath, options)', (t) => {
    assertProcess(
      t,
      cp.fork(modulePath, {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      })
    );
  });

  test('fork(modulePath, options) - with custom env', (t) => {
    assertProcess(
      t,
      cp.fork(modulePath, {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        env: { custom: 'custom' },
      }),
      { stdout: 'custom' }
    );
  });

  test('fork(modulePath, args, options)', (t) => {
    assertProcess(
      t,
      cp.fork(modulePath, [], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      })
    );
  });

  test('fork(modulePath, args, options) - with custom env', (t) => {
    assertProcess(
      t,
      cp.fork(modulePath, [], {
        stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        env: { custom: 'custom' },
      }),
      { stdout: 'custom' }
    );
  });

  for (const unset of notSet) {
    // NOTE: Forked processes don't have any stdout we can monitor without providing options
    test.skip(`fork(modulePath, ${unset})`, (t) => {
      assertProcess(t, cp.fork(modulePath, unset));
    });

    // NOTE: Forked processes don't have any stdout we can monitor without providing options
    test.skip(`fork(modulePath, ${unset}, ${unset})`, (t) => {
      assertProcess(t, cp.fork(modulePath, unset, unset));
    });

    test(`fork(modulePath, ${unset}, options)`, (t) => {
      assertProcess(
        t,
        cp.fork(modulePath, unset, {
          stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
        })
      );
    });
  }
}

{
  const command = path.join('test', 'harden', '_echo.sh');

  test('spawn(command)', (t) => {
    assertProcess(t, cp.spawn(command));
  });

  test('spawn(command, args)', (t) => {
    assertProcess(t, cp.spawn(command, []));
  });

  test('spawn(command, options)', (t) => {
    assertProcess(t, cp.spawn(command, {}));
  });

  test('spawn(command, options) - with custom env', (t) => {
    assertProcess(t, cp.spawn(command, { env: { custom: 'custom' } }), { stdout: 'custom' });
  });

  test('spawn(command, args, options)', (t) => {
    assertProcess(t, cp.spawn(command, [], {}));
  });

  test('spawn(command, args, options) - with custom env', (t) => {
    assertProcess(t, cp.spawn(command, [], { env: { custom: 'custom' } }), { stdout: 'custom' });
  });

  test('spawn(command, options) - prevent object prototype pollution', (t) => {
    const pathName = path.join(__dirname, '_node_script.js');
    const options = {};
    const pollutedObject = {
      env: {
        NODE_OPTIONS: `--require ${pathName}`,
      },
      shell: process.argv[0],
    };
    // eslint-disable-next-line no-proto
    options.__proto__['2'] = pollutedObject;

    const argsArray = [];

    /**
     * Declares that 3 assertions should be run.
     * We don't use the assertProcess function here as we need an extra assertion
     * for the polluted prototype
     */
    t.plan(3);

    t.deepEqual(
      argsArray[2],
      pollutedObject,
      'Prototype should be polluted with the object at index 2'
    );

    const stdout = '';

    const cmd = cp.spawn(command, argsArray);
    cmd.stdout.on('data', (data) => {
      t.equal(data.toString().trim(), stdout);
    });

    cmd.stderr.on('data', (data) => {
      t.fail(`Unexpected data on STDERR: "${data}"`);
    });

    cmd.on('close', (code) => {
      t.equal(code, 0);
      t.end();
    });
  });

  for (const unset of notSet) {
    test(`spawn(command, ${unset})`, (t) => {
      assertProcess(t, cp.spawn(command, unset));
    });

    test(`spawn(command, ${unset}, ${unset})`, (t) => {
      assertProcess(t, cp.spawn(command, unset, unset));
    });

    test(`spawn(command, ${unset}, options)`, (t) => {
      assertProcess(t, cp.spawn(command, unset, {}));
    });
  }
}

{
  const file = path.join('test', 'harden', '_echo.sh');

  test('execFileSync(file)', (t) => {
    t.equal(cp.execFileSync(file).toString().trim(), '');
    t.end();
  });

  test('execFileSync(file, args)', (t) => {
    t.equal(cp.execFileSync(file, []).toString().trim(), '');
    t.end();
  });

  test('execFileSync(file, options)', (t) => {
    t.equal(cp.execFileSync(file, {}).toString().trim(), '');
    t.end();
  });

  test('execFileSync(file, options) - with custom env', (t) => {
    t.equal(
      cp
        .execFileSync(file, { env: { custom: 'custom' } })
        .toString()
        .trim(),
      'custom'
    );
    t.end();
  });

  test('execFileSync(file, args, options)', (t) => {
    t.equal(cp.execFileSync(file, [], {}).toString().trim(), '');
    t.end();
  });

  test('execFileSync(file, args, options) - with custom env', (t) => {
    t.equal(
      cp
        .execFileSync(file, [], { env: { custom: 'custom' } })
        .toString()
        .trim(),
      'custom'
    );
    t.end();
  });

  for (const unset of notSet) {
    test(`execFileSync(file, ${unset})`, (t) => {
      t.equal(cp.execFileSync(file, unset).toString().trim(), '');
      t.end();
    });

    test(`execFileSync(file, ${unset}, ${unset})`, (t) => {
      t.equal(cp.execFileSync(file, unset, unset).toString().trim(), '');
      t.end();
    });

    test(`execFileSync(file, ${unset}, options)`, (t) => {
      t.equal(cp.execFileSync(file, unset, {}).toString().trim(), '');
      t.end();
    });
  }
}

{
  const command = 'echo $POLLUTED$custom';

  test('execSync(command)', (t) => {
    t.equal(cp.execSync(command).toString().trim(), '');
    t.end();
  });

  test('execSync(command, options)', (t) => {
    t.equal(cp.execSync(command, {}).toString().trim(), '');
    t.end();
  });

  test('execSync(command, options) - with custom env', (t) => {
    t.equal(
      cp
        .execSync(command, { env: { custom: 'custom' } })
        .toString()
        .trim(),
      'custom'
    );
    t.end();
  });

  for (const unset of notSet) {
    test(`execSync(command, ${unset})`, (t) => {
      t.equal(cp.execSync(command, unset).toString().trim(), '');
      t.end();
    });
  }
}

{
  const command = path.join('test', 'harden', '_echo.sh');

  test('spawnSync(command)', (t) => {
    const result = cp.spawnSync(command);
    t.error(result.error);
    t.equal(result.stdout.toString().trim(), '');
    t.equal(result.stderr.toString().trim(), '');
    t.end();
  });

  test('spawnSync(command, args)', (t) => {
    const result = cp.spawnSync(command, []);
    t.error(result.error);
    t.equal(result.stdout.toString().trim(), '');
    t.equal(result.stderr.toString().trim(), '');
    t.end();
  });

  test('spawnSync(command, options)', (t) => {
    const result = cp.spawnSync(command, {});
    t.error(result.error);
    t.equal(result.stdout.toString().trim(), '');
    t.equal(result.stderr.toString().trim(), '');
    t.end();
  });

  test('spawnSync(command, options) - with custom env', (t) => {
    const result = cp.spawnSync(command, { env: { custom: 'custom' } });
    t.error(result.error);
    t.equal(result.stdout.toString().trim(), 'custom');
    t.equal(result.stderr.toString().trim(), '');
    t.end();
  });

  test('spawnSync(command, args, options)', (t) => {
    const result = cp.spawnSync(command, [], {});
    t.error(result.error);
    t.equal(result.stdout.toString().trim(), '');
    t.equal(result.stderr.toString().trim(), '');
    t.end();
  });

  test('spawnSync(command, args, options) - with custom env', (t) => {
    const result = cp.spawnSync(command, [], { env: { custom: 'custom' } });
    t.error(result.error);
    t.equal(result.stdout.toString().trim(), 'custom');
    t.equal(result.stderr.toString().trim(), '');
    t.end();
  });

  for (const unset of notSet) {
    test(`spawnSync(command, ${unset})`, (t) => {
      const result = cp.spawnSync(command, unset);
      t.error(result.error);
      t.equal(result.stdout.toString().trim(), '');
      t.equal(result.stderr.toString().trim(), '');
      t.end();
    });

    test(`spawnSync(command, ${unset}, ${unset})`, (t) => {
      const result = cp.spawnSync(command, unset, unset);
      t.error(result.error);
      t.equal(result.stdout.toString().trim(), '');
      t.equal(result.stderr.toString().trim(), '');
      t.end();
    });

    test(`spawnSync(command, ${unset}, options)`, (t) => {
      const result = cp.spawnSync(command, unset, {});
      t.error(result.error);
      t.equal(result.stdout.toString().trim(), '');
      t.equal(result.stderr.toString().trim(), '');
      t.end();
    });
  }
}

function assertProcess(t, cmd, { stdout = '' } = {}) {
  t.plan(2);

  cmd.stdout.on('data', (data) => {
    t.equal(data.toString().trim(), stdout);
  });

  cmd.stderr.on('data', (data) => {
    t.fail(`Unexpected data on STDERR: "${data}"`);
  });

  cmd.on('close', (code) => {
    t.equal(code, 0);
    t.end();
  });
}
