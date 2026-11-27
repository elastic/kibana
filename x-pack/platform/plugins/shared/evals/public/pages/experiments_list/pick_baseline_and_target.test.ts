/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pickBaselineAndTarget } from './pick_baseline_and_target';

const OLD = '2026-01-01T00:00:00.000Z';
const NEW = '2026-01-02T00:00:00.000Z';

describe('pickBaselineAndTarget', () => {
  it.each([
    ['the baseline is the run on main even when it is newer', 'main', NEW, 'feature', OLD],
    ['the baseline is the older run when both are on main', 'main', OLD, 'main', NEW],
    ['the baseline is the older run when neither is on main', 'feature', OLD, null, NEW],
  ])('%s, in either click order', (_, branch, time, otherBranch, otherTime) => {
    const baseline = { git_branch: branch, timestamp: time };
    const target = { git_branch: otherBranch, timestamp: otherTime };

    expect(pickBaselineAndTarget(baseline, target)).toEqual({ baseline, target });
    expect(pickBaselineAndTarget(target, baseline)).toEqual({ baseline, target });
  });
});
