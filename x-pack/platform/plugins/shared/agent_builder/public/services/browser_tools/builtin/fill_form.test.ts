/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { callContext, createDeps, mockLayout } from './test_helpers.mock';
import { createFillFormTool } from './fill_form';
import { createGetPageSnapshotTool } from './get_page_snapshot';

describe('fill_form', () => {
  let restore: () => void;
  beforeEach(() => {
    restore = mockLayout();
  });
  afterEach(() => restore());

  const snapshotRefs = async (deps: ReturnType<typeof createDeps>) => {
    const snap = (await createGetPageSnapshotTool(deps).handler({}, callContext())) as {
      content: string;
    };
    return snap.content.match(/s\d+e\d+/g)!;
  };

  interface FillResult {
    content: { fields: Array<{ ref: string; status: string }>; snapshot: string };
  }

  it('updates controlled inputs, checkboxes and selects through native setters', async () => {
    document.body.innerHTML = `
      <input aria-label="Name" />
      <input type="checkbox" aria-label="Agree" />
      <select aria-label="Color"><option value="r">Red</option><option value="g">Green</option></select>
      <div role="button">x</div>`;
    const deps = createDeps();
    const [name, agree, color] = await snapshotRefs(deps);
    const seen: string[] = [];
    document.querySelector('input')!.addEventListener('input', (e) => {
      seen.push((e.target as HTMLInputElement).value);
    });
    const changed = jest.fn();
    document.querySelector('select')!.addEventListener('change', changed);

    const result = (await createFillFormTool(deps).handler(
      {
        fields: [
          { ref: name, value: 'Ada' },
          { ref: agree, value: 'true' },
          { ref: color, value: 'Green' },
          { ref: 's9e9', value: 'x' },
        ],
      },
      callContext()
    )) as FillResult;

    expect(seen).toEqual(['Ada']);
    expect((document.querySelector('input[type=checkbox]') as HTMLInputElement).checked).toBe(true);
    expect(document.querySelector('select')!.value).toBe('g');
    expect(changed).toHaveBeenCalled();
    expect(result.content.fields.map((f) => f.status)).toEqual([
      'filled',
      'filled',
      'filled',
      'stale_ref',
    ]);
    expect(result.content.snapshot).toContain('current app: discover');
  });

  it('reports not_fillable for non-form elements', async () => {
    document.body.innerHTML = '<button>Go</button><input aria-label="Name" />';
    const deps = createDeps();
    const [button, input] = await snapshotRefs(deps);
    const result = (await createFillFormTool(deps).handler(
      {
        fields: [
          { ref: button, value: 'x' },
          { ref: input, value: 'y' },
        ],
      },
      callContext()
    )) as FillResult;
    expect(result.content.fields.map((f) => f.status)).toEqual(['not_fillable', 'filled']);
  });

  it('throws when every field failed', async () => {
    await expect(
      createFillFormTool(createDeps()).handler(
        { fields: [{ ref: 's9e9', value: 'x' }] },
        callContext()
      )
    ).rejects.toThrow('No field could be filled');
  });

  it('is not fooled by a React-style value tracker: uses the prototype setter', async () => {
    document.body.innerHTML = '<input aria-label="Name" /><div role="button">x</div>';
    const input = document.querySelector('input')!;
    let tracked = 'old';
    // React's inputValueTracking shadows the prototype setter on the instance
    Object.defineProperty(input, 'value', {
      configurable: true,
      get: () => tracked,
      set: (v: string) => {
        tracked = v;
      },
    });
    const deps = createDeps();
    const [ref] = await snapshotRefs(deps);
    const seen: Array<{ value: string; tracked: string }> = [];
    input.addEventListener('input', (e) => {
      seen.push({
        value: Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.get!.call(
          e.target
        ),
        tracked,
      });
    });

    await createFillFormTool(deps).handler({ fields: [{ ref, value: 'Ada' }] }, callContext());

    expect(seen).toEqual([{ value: 'Ada', tracked: 'old' }]);
  });

  it('refuses to uncheck a radio but unchecks a checkbox', async () => {
    document.body.innerHTML = `
      <input type="radio" aria-label="R" checked />
      <input type="checkbox" aria-label="C" checked />`;
    const deps = createDeps();
    const [radio, checkbox] = await snapshotRefs(deps);
    const events = jest.fn();
    document.querySelectorAll('input').forEach((i) => i.addEventListener('change', events));
    const result = (await createFillFormTool(deps).handler(
      {
        fields: [
          { ref: radio, value: 'false' },
          { ref: checkbox, value: 'false' },
        ],
      },
      callContext()
    )) as FillResult;
    expect(result.content.fields.map((f) => f.status)).toEqual(['not_fillable', 'filled']);
    expect((document.querySelector('input[type=radio]') as HTMLInputElement).checked).toBe(true);
    expect((document.querySelector('input[type=checkbox]') as HTMLInputElement).checked).toBe(
      false
    );
    expect(events).toHaveBeenCalledTimes(1);
  });
});
