/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppStatus } from '@kbn/core/public';
import { callContext, createDeps, mockLayout } from './test_helpers.mock';
import { createGetPageSnapshotTool } from './get_page_snapshot';

describe('get_page_snapshot', () => {
  let restore: () => void;
  beforeEach(() => {
    restore = mockLayout();
  });
  afterEach(() => restore());

  it('returns the snapshot with accessible apps only, sorted by title', async () => {
    document.body.innerHTML = '<button>Save</button>';
    const deps = createDeps([
      { id: 'b', title: 'Zeta' },
      { id: 'a', title: 'Alpha' },
      { id: 'hidden', title: 'Hidden', visibleIn: [] },
      { id: 'off', title: 'Off', status: AppStatus.inaccessible },
    ]);
    const result = await createGetPageSnapshotTool(deps).handler({}, callContext());
    const content = (result as { content: string }).content;
    expect(content).toContain('current app: discover');
    expect(content).toContain('button "Save"');
    expect(content).toContain('Alpha');
    expect(content.indexOf('Alpha')).toBeLessThan(content.indexOf('Zeta'));
    expect(content).not.toContain('Hidden');
    expect(content).not.toContain('Off');
  });

  it('throws when aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      createGetPageSnapshotTool(createDeps()).handler({}, callContext(controller.signal))
    ).rejects.toThrow('aborted');
  });
});
