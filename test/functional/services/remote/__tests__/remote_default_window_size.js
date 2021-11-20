/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { fork } from 'child_process';

import expect from '@kbn/expect';

const FTR_SCRIPT = require.resolve('../../../../../scripts/functional_test_runner');
const CONFIG_PATH = require.resolve('./fixtures/several_nested_window_size_changes/config.js');
const SECOND = 1000;

const DEFAULT_SIZE = { width: 1600, height: 1000 };
const SUITE1_SIZE = { width: 1000, height: 1000 };
const SUITE2_SIZE = { width: 900, height: 900 };
const SUITE3_SIZE = { width: 800, height: 800 };
const SUITE31_SIZE = { width: 700, height: 700 };

describe('remote default window size', function () {
  // give the tests some time to initialize the FTR and Chrome
  this.timeout(30 * SECOND);

  it('restores the window size after a suite completes', async () => {
    const proc = fork(FTR_SCRIPT, ['--config', CONFIG_PATH], {
      silent: true,
    });

    const messages = [];
    proc.on('message', (msg) => {
      messages.push(msg);
    });

    await new Promise((resolve, reject) => {
      proc.once('exit', resolve);
      proc.once('error', reject);
    });

    expect(messages).to.eql([
      // default width/height
      { name: 'before suite1', size: DEFAULT_SIZE },
      // suite1 uses 1000X1000
      { name: 'in suite1', size: SUITE1_SIZE },
      // suite2 should start with suite1's size
      { name: 'before suite2', size: SUITE1_SIZE },
      // but it changes it to 900X900
      { name: 'in suite2', size: SUITE2_SIZE },
      // and it should still be 900X900 when it ends
      { name: 'after suite2', size: SUITE2_SIZE },
      // suite3 should then start with suite1's size, because suite2's was rolled back
      { name: 'before suite3', size: SUITE1_SIZE },
      // it then runs in 800x800
      { name: 'in suite3', size: SUITE3_SIZE },
      // suite3.1 runs within 3, so it should start with suite3 size
      { name: 'before suite3.1', size: SUITE3_SIZE },
      // then switch to its 700x700 size
      { name: 'in suite3.1', size: SUITE31_SIZE },
      // and still has 800x800 in it's last after hook
      { name: 'after suite3.1', size: SUITE31_SIZE },
      // but suite3 size should be restored before running suite3's after hook
      { name: 'after suite3', size: SUITE3_SIZE },
      // then finally, suite1 should complete with 1000X1000 because suite3's size was rolled back
      { name: 'after suite1', size: SUITE1_SIZE },
    ]);
  });
});
