/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { callContext, createDeps, mockLayout } from './test_helpers.mock';
import { createClickElementTool } from './click_element';
import { createGetPageSnapshotTool } from './get_page_snapshot';

describe('click_element', () => {
  let restore: () => void;
  beforeEach(() => {
    restore = mockLayout();
  });
  afterEach(() => restore());

  it('clicks the resolved element and returns a fresh snapshot', async () => {
    document.body.innerHTML = '<button>Save</button>';
    const deps = createDeps();
    const onClick = jest.fn();
    document.querySelector('button')!.addEventListener('click', onClick);
    const snap = (await createGetPageSnapshotTool(deps).handler({}, callContext())) as {
      content: string;
    };
    const match = /s\d+e\d+/.exec(snap.content)!;

    const result = (await createClickElementTool(deps).handler(
      { ref: match[0] },
      callContext()
    )) as { content: { clicked: string; snapshot: string } };

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(result.content.clicked).toBe('Save');
    expect(result.content.snapshot).toContain('current app: discover');
  });

  it('errors on a stale ref', async () => {
    await expect(
      createClickElementTool(createDeps()).handler({ ref: 's9e9' }, callContext())
    ).rejects.toThrow('Stale or unknown ref "s9e9": take a new snapshot');
  });

  it('does not click when aborted', async () => {
    document.body.innerHTML = '<button>Save</button>';
    const deps = createDeps();
    const snap = (await createGetPageSnapshotTool(deps).handler({}, callContext())) as {
      content: string;
    };
    const ref = /s\d+e\d+/.exec(snap.content)![0];
    const onClick = jest.fn();
    document.querySelector('button')!.addEventListener('click', onClick);
    const controller = new AbortController();
    controller.abort();
    await expect(
      createClickElementTool(deps).handler({ ref }, callContext(controller.signal))
    ).rejects.toThrow('aborted');
    expect(onClick).not.toHaveBeenCalled();
  });

  it('reports disabled elements without clicking them', async () => {
    document.body.innerHTML = '<button disabled>Save</button>';
    const deps = createDeps();
    const snap = (await createGetPageSnapshotTool(deps).handler({}, callContext())) as {
      content: string;
    };
    const ref = /s\d+e\d+/.exec(snap.content)![0];
    const onClick = jest.fn();
    document.querySelector('button')!.addEventListener('click', onClick);
    const result = (await createClickElementTool(deps).handler({ ref }, callContext())) as {
      content: { disabled?: boolean };
    };
    expect(result.content.disabled).toBe(true);
    expect(onClick).not.toHaveBeenCalled();
  });
});
