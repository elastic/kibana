/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RefStore } from './ref_store';
import { buildPageSnapshot } from './build_page_snapshot';

const visibleRect = { width: 10, height: 10, top: 0, left: 0, right: 10, bottom: 10, x: 0, y: 0 };

const render = (html: string): HTMLElement => {
  const root = document.createElement('div');
  root.innerHTML = html;
  document.body.appendChild(root);
  return root;
};

const snapshot = (root: Element, refStore = new RefStore(), maxChars?: number) =>
  buildPageSnapshot({ root, refStore, currentAppId: 'discover', apps: [], maxChars });

/** Lines of the tree only (between the header and the apps section). */
const treeLines = (output: string): string[] => {
  const lines = output.split('\n');
  const end = lines.indexOf('');
  return lines.slice(1, end);
};

describe('buildPageSnapshot', () => {
  let originalCheckVisibility: unknown;
  let originalGetBoundingClientRect: typeof Element.prototype.getBoundingClientRect;

  beforeEach(() => {
    const proto = Element.prototype as unknown as Record<string, unknown>;
    originalCheckVisibility = proto.checkVisibility;
    originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
    proto.checkVisibility = () => true;
    Element.prototype.getBoundingClientRect = () => visibleRect as DOMRect;
  });

  afterEach(() => {
    const proto = Element.prototype as unknown as Record<string, unknown>;
    if (originalCheckVisibility === undefined) {
      delete proto.checkVisibility;
    } else {
      proto.checkVisibility = originalCheckVisibility;
    }
    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    document.body.innerHTML = '';
  });

  it('emits roles, names and refs for interactive elements', () => {
    const root = render(`
      <nav aria-label="Main">
        <div><div>
          <a href="/app/discover">Discover</a>
          <button>Save</button>
        </div></div>
      </nav>
      <h2>Results</h2>
      <label for="q">Query</label>
      <input id="q" type="text" value="host.name : *" />
      <input type="password" aria-label="Secret" value="hunter2" />
      <input type="checkbox" aria-label="Pin" checked />
      <button aria-expanded="false" disabled>More</button>
      <select aria-label="Size">
        <option value="s">Small</option>
        <option value="l" selected>Large</option>
      </select>
      <input type="submit" value="Go" />
    `);
    // Native options have no layout box in a real browser: the walker must not depend on it.
    root.querySelectorAll('option').forEach((option) => {
      option.getBoundingClientRect = () => ({ ...visibleRect, width: 0, height: 0 } as DOMRect);
      (option as unknown as { checkVisibility: () => boolean }).checkVisibility = () => false;
    });
    const refStore = new RefStore();
    const output = snapshot(root, refStore);
    expect(treeLines(output)).toEqual([
      '- navigation "Main"',
      '  - link "Discover" [ref=s1e1]',
      '  - button "Save" [ref=s1e2]',
      '- heading "Results" [level=2]',
      '- text "Query"',
      '- textbox "Query" [ref=s1e3] value="host.name : *"',
      '- textbox "Secret" [ref=s1e4]',
      '- checkbox "Pin" [ref=s1e5] [checked]',
      '- button "More" [ref=s1e6] [collapsed] [disabled]',
      '- combobox "Size" [ref=s1e7] value="Large"',
      '  - option "Small"',
      '  - option "Large" [selected]',
      '- button "Go" [ref=s1e8]',
    ]);
  });

  it('prefers aria-label over text content and caps names at 80 chars', () => {
    const long = 'x'.repeat(200);
    const root = render(`
      <button aria-label="Close flyout">X</button>
      <button>${long}</button>
    `);
    const lines = treeLines(snapshot(root));
    expect(lines).toEqual([
      '- button "Close flyout" [ref=s1e1]',
      // The name did not come from the content, so the content is still shown.
      '  - text "X"',
      `- button "${'x'.repeat(79)}…" [ref=s1e2]`,
    ]);
  });

  it('flattens unnamed wrappers, names svgs from their title and does not repeat named text', () => {
    const root = render(`
      <div><p>Hello <b>world</b></p></div>
      <button><span>Save</span> <svg><title>Disk</title></svg></button>
      <svg><text>Axis</text></svg>
      <div role="tab" aria-selected="true" aria-expanded="true">Overview</div>
    `);
    expect(treeLines(snapshot(root))).toEqual([
      '- text "Hello"',
      '- text "world"',
      '- button "Save Disk" [ref=s1e1]',
      '  - img "Disk"',
      '- tab "Overview" [ref=s1e2] [expanded] [selected]',
    ]);
  });

  it('keeps the rest of the page when a form control holds a huge value', () => {
    const root = render(`
      <textarea aria-label="Query">${'q'.repeat(50_000)}</textarea>
      <p>${'t'.repeat(1_000)}</p>
      <button>Run</button>
    `);
    const lines = treeLines(snapshot(root));
    expect(lines).toEqual([
      `- textbox "Query" [ref=s1e1] value="${'q'.repeat(199)}…"`,
      `- text "${'t'.repeat(299)}…"`,
      '- button "Run" [ref=s1e2]',
    ]);
  });

  it('does not name containers from their content, so their text stays readable', () => {
    const long = 'word '.repeat(40).trim();
    const root = render(`
      <ul>
        <li><p>${long}</p></li>
        <li aria-label="Item"><span>details</span></li>
      </ul>
      <table><tr><td>42</td></tr></table>
    `);
    expect(treeLines(snapshot(root))).toEqual([
      '- list',
      `  - listitem`,
      `    - text "${long}"`,
      '  - listitem "Item"',
      '    - text "details"',
      '- table',
      '  - row',
      '    - cell',
      '      - text "42"',
    ]);
  });

  it('escapes quotes and newlines and prints unnamed nodes without a name', () => {
    const root = render(`
      <button aria-label='Say "hi"'></button>
      <textarea aria-label="Notes">line 1
line "2"</textarea>
      <button></button>
    `);
    expect(treeLines(snapshot(root))).toEqual([
      '- button "Say \\"hi\\"" [ref=s1e1]',
      '- textbox "Notes" [ref=s1e2] value="line 1\\nline \\"2\\""',
      '- button [ref=s1e3]',
    ]);
  });

  it('omits the value of credit card and password-autocomplete inputs', () => {
    const root = render(`
      <input aria-label="Card" autocomplete="cc-number" value="4111111111111111" />
      <input aria-label="Pass" autocomplete="current-password" value="secret" />
      <input aria-label="City" autocomplete="address-level2" value="Paris" />
    `);
    expect(treeLines(snapshot(root))).toEqual([
      '- textbox "Card" [ref=s1e1]',
      '- textbox "Pass" [ref=s1e2]',
      '- textbox "City" [ref=s1e3] value="Paris"',
    ]);
  });

  it('includes data-test-subj when present', () => {
    const root = render(`<button data-test-subj="saveButton">Save</button>`);
    expect(treeLines(snapshot(root))).toEqual([
      '- button "Save" [ref=s1e1] test-subj="saveButton"',
    ]);
  });

  it('skips hidden nodes and the chat surface', () => {
    const root = render(`
      <button>Visible</button>
      <button aria-hidden="true">AriaHidden</button>
      <button hidden>HiddenAttr</button>
      <button id="invisible">NotVisible</button>
      <button id="zero">ZeroSize</button>
      <div data-agent-builder-surface><button>Send</button></div>
      <script>var x = 1;</script>
    `);
    (
      root.querySelector('#invisible') as unknown as { checkVisibility: () => boolean }
    ).checkVisibility = () => false;
    root.querySelector('#zero')!.getBoundingClientRect = () =>
      ({ ...visibleRect, width: 0, height: 0 } as DOMRect);
    expect(treeLines(snapshot(root))).toEqual(['- button "Visible" [ref=s1e1]']);
  });

  it('refs are generation-qualified and resolve to the live element', () => {
    const root = render(`<button id="b">Save</button>`);
    const refStore = new RefStore();
    expect(treeLines(snapshot(root, refStore))).toEqual(['- button "Save" [ref=s1e1]']);
    expect(treeLines(snapshot(root, refStore))).toEqual(['- button "Save" [ref=s2e1]']);
    const button = root.querySelector('#b');
    expect(refStore.resolve('s1e1')).toBe(button);
    expect(refStore.resolve('s2e1')).toBe(button);
    expect(refStore.resolve('s2e2')).toBeUndefined();
  });

  it('resolve returns undefined for a ref whose element was detached', () => {
    const root = render(`<button id="b">Save</button>`);
    const refStore = new RefStore();
    snapshot(root, refStore);
    expect(refStore.resolve('s1e1')).toBeDefined();
    root.querySelector('#b')!.remove();
    expect(refStore.resolve('s1e1')).toBeUndefined();
  });

  it('truncates the output at maxChars with a notice', () => {
    const buttons = Array.from({ length: 50 }, (_, i) => `<button>Button ${i}</button>`).join('');
    const root = render(buttons);
    const output = buildPageSnapshot({
      root,
      refStore: new RefStore(),
      currentAppId: 'discover',
      apps: [{ id: 'dashboards', title: 'Dashboards' }],
      maxChars: 300,
    });
    expect(output.length).toBeLessThanOrEqual(300);
    expect(output).toContain('… (truncated)');
    expect(output).toContain('- button "Button 0" [ref=s1e1]');
    expect(output).not.toContain('Button 49');
    expect(output.endsWith('apps:\n- dashboards "Dashboards"')).toBe(true);
  });

  it('lists apps and the current app id', () => {
    const root = render(`<button>Save</button>`);
    const output = buildPageSnapshot({
      root,
      refStore: new RefStore(),
      currentAppId: 'discover',
      apps: [
        { id: 'discover', title: 'Discover' },
        { id: 'dashboards', title: 'Dashboards' },
      ],
    });
    expect(output).toBe(
      [
        'current app: discover',
        '- button "Save" [ref=s1e1]',
        '',
        'apps:',
        '- discover "Discover"',
        '- dashboards "Dashboards"',
      ].join('\n')
    );
    expect(buildPageSnapshot({ root, refStore: new RefStore(), apps: [] }).split('\n')[0]).toBe(
      'current app: unknown'
    );
  });
});
