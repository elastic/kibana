/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  appDocumentSchema,
  stateKeySchema,
  type AppDocument,
  type AppNode,
} from './document_schema';
import {
  addNode,
  createNodeId,
  createStateKey,
  pruneUnusedValues,
  stateKeyForColumn,
  duplicateNode,
  findNode,
  moveNode,
  removeNode,
  removeStateKey,
  setStateDeclaration,
  updateNode,
} from './document_mutations';
import { getNodeChildren } from './node_tree';

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
};

/** root > [ title, group > [ note, table ], detail (flyout) > [ facts ] ] */
const fixture = (): AppDocument =>
  deepFreeze(
    appDocumentSchema.parse({
      state: { service: { type: 'string', default: '' } },
      root: {
        type: 'stack',
        id: 'root',
        children: [
          { type: 'heading', id: 'title', text: 'Title' },
          {
            type: 'stack',
            id: 'group',
            children: [
              { type: 'text', id: 'note', text: 'Note' },
              {
                type: 'table',
                id: 'table',
                query: 'FROM s',
                onRowClick: [
                  { type: 'setState', key: 'service', value: { fromColumn: 'service' } },
                  { type: 'openFlyout', flyout: 'detail' },
                  { type: 'openFlyout', flyout: 'other' },
                ],
              },
            ],
          },
          {
            type: 'flyout',
            id: 'detail',
            title: 'Detail',
            children: [{ type: 'key_value', id: 'facts', query: 'FROM s' }],
          },
          { type: 'flyout', id: 'other', title: 'Other', children: [] },
        ],
      },
    })
  );

const ids = (node: AppNode): string[] => [
  node.id,
  ...getNodeChildren(node).flatMap((child) => ids(child)),
];

const childIds = (document: AppDocument, parentId: string): string[] =>
  getNodeChildren(findNode(document.root, parentId)!.node).map(({ id }) => id);

const succeeds = (result: ReturnType<typeof addNode>): AppDocument => {
  if (!result.ok) throw new Error(`Expected success but got: ${result.reason}`);
  return result.document;
};

const newText = (id: string): AppNode => ({ type: 'text', id, text: 'New' });

describe('findNode', () => {
  it('finds the root, a nested node, and the position of a node in its parent', () => {
    const { root } = fixture();

    expect(findNode(root, 'root')?.node.id).toBe('root');
    expect(findNode(root, 'root')?.parent).toBeUndefined();
    expect(findNode(root, 'table')).toMatchObject({
      node: { id: 'table' },
      parent: { id: 'group' },
      index: 1,
    });
    expect(findNode(root, 'facts')?.parent?.id).toBe('detail');
  });

  it('finds nothing for an unknown id', () => {
    expect(findNode(fixture().root, 'nope')).toBeUndefined();
  });
});

describe('createNodeId', () => {
  it('uses the first unused number for the type', () => {
    const document = fixture();

    expect(createNodeId(document, 'text')).toBe('text-1');
    expect(createNodeId(document, 'stat')).toBe('stat-1');
  });

  it('skips ids in the document and ids the caller has already handed out', () => {
    const document = succeeds(addNode(fixture(), 'root', newText('text-1')));

    expect(createNodeId(document, 'text')).toBe('text-2');
    expect(createNodeId(document, 'text', new Set(['text-2', 'text-3']))).toBe('text-4');
  });
});

describe('addNode', () => {
  it('appends to a container, and leaves the original document untouched', () => {
    const before = fixture();

    const after = succeeds(addNode(before, 'group', newText('added')));

    expect(childIds(after, 'group')).toEqual(['note', 'table', 'added']);
    expect(childIds(before, 'group')).toEqual(['note', 'table']);
  });

  it('inserts at an index, clamping one that is out of range', () => {
    const document = fixture();

    expect(childIds(succeeds(addNode(document, 'group', newText('x'), 0)), 'group')).toEqual([
      'x',
      'note',
      'table',
    ]);
    expect(childIds(succeeds(addNode(document, 'group', newText('x'), 99)), 'group')).toEqual([
      'note',
      'table',
      'x',
    ]);
    expect(childIds(succeeds(addNode(document, 'group', newText('x'), -5)), 'group')).toEqual([
      'x',
      'note',
      'table',
    ]);
  });

  it('can add to a flyout', () => {
    expect(childIds(succeeds(addNode(fixture(), 'other', newText('x'))), 'other')).toEqual(['x']);
  });

  it('refuses an unknown parent, a parent that is not a container, and a taken id', () => {
    const document = fixture();

    expect(addNode(document, 'nope', newText('x'))).toEqual({
      ok: false,
      reason: 'There is no node "nope"',
    });
    expect(addNode(document, 'title', newText('x'))).toEqual({
      ok: false,
      reason: '"title" cannot hold other nodes',
    });
    expect(addNode(document, 'group', newText('note'))).toEqual({
      ok: false,
      reason: 'There is already a node "note"',
    });
  });
});

describe('removeNode', () => {
  it('removes a node with everything under it', () => {
    const after = succeeds(removeNode(fixture(), 'detail'));

    expect(ids(after.root)).not.toContain('detail');
    expect(ids(after.root)).not.toContain('facts');
    expect(ids(after.root)).toContain('other');
  });

  it('removes the actions that opened a removed flyout, and only those', () => {
    const after = succeeds(removeNode(fixture(), 'detail'));

    const { node } = findNode(after.root, 'table')!;
    expect(node).toMatchObject({
      onRowClick: [
        { type: 'setState', key: 'service' },
        { type: 'openFlyout', flyout: 'other' },
      ],
    });
  });

  it('removes the actions that opened a flyout nested in a removed subtree', () => {
    const document = succeeds(
      addNode(fixture(), 'group', {
        type: 'flyout',
        id: 'nested',
        title: 'N',
        children: [],
      })
    );
    const withAction = succeeds(
      updateNode<'table'>(document, 'table', {
        onRowClick: [{ type: 'openFlyout', flyout: 'nested' }],
      })
    );

    const after = succeeds(removeNode(withAction, 'group'));

    expect(findNode(after.root, 'nested')).toBeUndefined();
    expect(findNode(after.root, 'table')).toBeUndefined();
  });

  it('also cleans up actions on inputs', () => {
    const document = succeeds(
      addNode(fixture(), 'root', {
        type: 'select',
        id: 'pick',
        label: 'Pick',
        bind: 'service',
        options: [{ value: 'a' }],
        onChange: [{ type: 'openFlyout', flyout: 'other' }, { type: 'closeFlyout' }],
      })
    );

    const after = succeeds(removeNode(document, 'other'));

    expect(findNode(after.root, 'pick')!.node).toMatchObject({
      onChange: [{ type: 'closeFlyout' }],
    });
  });

  it('refuses to remove the root or something that does not exist', () => {
    expect(removeNode(fixture(), 'root')).toEqual({
      ok: false,
      reason: 'The root cannot be removed',
    });
    expect(removeNode(fixture(), 'nope')).toEqual({
      ok: false,
      reason: 'There is no node "nope"',
    });
  });
});

describe('moveNode', () => {
  it('reorders within a container', () => {
    const after = succeeds(moveNode(fixture(), 'table', 'group', 0));

    expect(childIds(after, 'group')).toEqual(['table', 'note']);
  });

  it('counts the index after the node has been taken out of its container', () => {
    const document = succeeds(addNode(fixture(), 'group', newText('last')));

    expect(childIds(succeeds(moveNode(document, 'note', 'group', 1)), 'group')).toEqual([
      'table',
      'note',
      'last',
    ]);
    expect(childIds(succeeds(moveNode(document, 'note', 'group', 2)), 'group')).toEqual([
      'table',
      'last',
      'note',
    ]);
  });

  it('moves a node, with its subtree, into another container', () => {
    const after = succeeds(moveNode(fixture(), 'group', 'detail', 0));

    expect(childIds(after, 'detail')).toEqual(['group', 'facts']);
    expect(childIds(after, 'root')).not.toContain('group');
    expect(ids(findNode(after.root, 'group')!.node)).toEqual(['group', 'note', 'table']);
  });

  it('refuses to move the root, a missing node, into a leaf, or into itself or its own subtree', () => {
    const document = fixture();

    expect(moveNode(document, 'root', 'group', 0)).toMatchObject({ ok: false });
    expect(moveNode(document, 'nope', 'group', 0)).toMatchObject({ ok: false });
    expect(moveNode(document, 'note', 'nope', 0)).toMatchObject({ ok: false });
    expect(moveNode(document, 'note', 'title', 0)).toMatchObject({
      ok: false,
      reason: '"title" cannot hold other nodes',
    });
    expect(moveNode(document, 'group', 'group', 0)).toMatchObject({
      ok: false,
      reason: 'A node cannot be moved into itself',
    });
    expect(moveNode(document, 'detail', 'facts', 0)).toMatchObject({ ok: false });
    expect(moveNode(document, 'root', 'group', 0)).toEqual({
      ok: false,
      reason: 'The root cannot be moved',
    });
  });

  it('never loses or duplicates a node', () => {
    const before = fixture();
    const after = succeeds(moveNode(before, 'table', 'root', 1));

    expect(ids(after.root).sort()).toEqual(ids(before.root).sort());
  });
});

describe('duplicateNode', () => {
  it('copies a node just after the original, with a new id', () => {
    const after = succeeds(duplicateNode(fixture(), 'note'));

    expect(childIds(after, 'group')).toEqual(['note', 'text-1', 'table']);
    expect(findNode(after.root, 'text-1')!.node).toMatchObject({ type: 'text', text: 'Note' });
  });

  it('gives every node in a copied subtree a new, unique id', () => {
    const after = succeeds(duplicateNode(fixture(), 'detail'));

    const all = ids(after.root);
    expect(new Set(all).size).toBe(all.length);
    expect(childIds(after, 'root')).toEqual(['title', 'group', 'detail', 'flyout-1', 'other']);
    expect(childIds(after, 'flyout-1')).toEqual(['key_value-1']);
  });

  it('numbers copies of several of the same type apart', () => {
    const once = succeeds(duplicateNode(fixture(), 'note'));
    const twice = succeeds(duplicateNode(once, 'note'));

    expect(childIds(twice, 'group')).toEqual(['note', 'text-2', 'text-1', 'table']);
  });

  it('does not alter the original', () => {
    const before = fixture();
    succeeds(duplicateNode(before, 'group'));

    expect(childIds(before, 'group')).toEqual(['note', 'table']);
  });

  it('refuses the root and unknown nodes', () => {
    expect(duplicateNode(fixture(), 'root')).toEqual({
      ok: false,
      reason: 'The root cannot be duplicated',
    });
    expect(duplicateNode(fixture(), 'nope')).toMatchObject({ ok: false });
  });
});

describe('updateNode', () => {
  it('changes properties and keeps everything else', () => {
    const after = succeeds(updateNode<'heading'>(fixture(), 'title', { text: 'New' }));

    expect(findNode(after.root, 'title')!.node).toEqual({
      type: 'heading',
      id: 'title',
      text: 'New',
    });
    expect(childIds(after, 'root')).toEqual(['title', 'group', 'detail', 'other']);
  });

  it('keeps the children of a container it updates', () => {
    const after = succeeds(updateNode<'stack'>(fixture(), 'group', { direction: 'horizontal' }));

    expect(childIds(after, 'group')).toEqual(['note', 'table']);
  });

  it('accepts a value that is not valid yet, so a field can be cleared while typing', () => {
    const after = succeeds(updateNode<'table'>(fixture(), 'table', { query: '' }));

    expect(findNode(after.root, 'table')!.node).toMatchObject({ query: '' });
    expect(appDocumentSchema.safeParse(after).success).toBe(false);
  });

  it('refuses an unknown node and leaves the original alone', () => {
    const before = fixture();

    expect(updateNode<'text'>(before, 'nope', { text: 'x' })).toEqual({
      ok: false,
      reason: 'There is no node "nope"',
    });
  });
});

describe('state', () => {
  it('adds, replaces and removes a state declaration', () => {
    const added = setStateDeclaration(fixture(), 'limit', { type: 'number', default: 5 });
    expect(added.state).toEqual({
      service: { type: 'string', default: '' },
      limit: { type: 'number', default: 5 },
    });

    const replaced = setStateDeclaration(added, 'limit', { type: 'number', default: 9 });
    expect(replaced.state.limit).toEqual({ type: 'number', default: 9 });

    expect(Object.keys(removeStateKey(replaced, 'limit').state)).toEqual(['service']);
  });

  it('leaves what still refers to a removed key to be reported by validation', () => {
    // The table's row click sets "service".
    const document = removeStateKey(fixture(), 'service');

    expect(appDocumentSchema.safeParse(document).success).toBe(false);
  });

  it('does not alter the original document', () => {
    const before = fixture();

    setStateDeclaration(before, 'x', { type: 'string', default: '' });
    removeStateKey(before, 'service');

    expect(Object.keys(before.state)).toEqual(['service']);
  });
});

describe('createStateKey', () => {
  it('names a value after the words it is given', () => {
    expect(createStateKey(fixture(), 'Service name')).toBe('service_name');
    expect(createStateKey(fixture(), '  Minimum   errors! ')).toBe('minimum_errors');
  });

  it('skips a name the document already uses', () => {
    const document = setStateDeclaration(fixture(), 'service_name', {
      type: 'string',
      default: '',
    });
    const twice = setStateDeclaration(document, 'service_name_2', { type: 'string', default: '' });

    expect(createStateKey(document, 'Service name')).toBe('service_name_2');
    expect(createStateKey(twice, 'Service name')).toBe('service_name_3');
  });

  it.each(['', '   ', '!!!', 'ñ é'])('falls back to a plain name for %p', (words) => {
    expect(createStateKey(fixture(), words)).toBe('value');
  });

  it('does not start a name with a digit', () => {
    expect(createStateKey(fixture(), '2nd filter')).toBe('value_2nd_filter');
  });

  it.each(['Service name', '2nd filter', '!!!', 'x'.repeat(200), '_tstart', 'ÀÉ Mixed Case 9'])(
    'always makes a name a state key can have, for %p',
    (words) => {
      expect(stateKeySchema.safeParse(createStateKey(fixture(), words)).success).toBe(true);
    }
  );

  it('keeps a long name within the limit even with a suffix', () => {
    const long = 'x'.repeat(200);
    const document = setStateDeclaration(fixture(), createStateKey(fixture(), long), {
      type: 'string',
      default: '',
    });

    expect(createStateKey(document, long).length).toBeLessThanOrEqual(64);
  });
});

describe('stateKeyForColumn', () => {
  it('names the value after the column', () => {
    expect(stateKeyForColumn(fixture(), 'Service Name')).toBe('service_name');
  });

  it('reuses a text value of that name, so the same column always means the same value', () => {
    // The fixture already has a text value "service".
    expect(stateKeyForColumn(fixture(), 'service')).toBe('service');
  });

  it('makes a new name rather than reuse a value of another type', () => {
    const numeric = setStateDeclaration(fixture(), 'count', { type: 'number', default: 0 });

    expect(stateKeyForColumn(numeric, 'count')).toBe('count_2');
  });
});

describe('a theme through the edits of a document', () => {
  const themed = appDocumentSchema.parse({
    theme: { accent: 'purple', shape: 'soft' },
    state: { service: { type: 'string', default: '' } },
    root: { type: 'stack', id: 'root', children: [{ type: 'text', id: 'intro', text: 'Hi' }] },
  });

  it('is kept when a node is added, changed, moved or removed', () => {
    const added = addNode(themed, 'root', { type: 'text', id: 'more', text: 'More' });
    expect(added.ok && added.document.theme).toEqual({ accent: 'purple', shape: 'soft' });

    const changed = updateNode<'text'>(themed, 'intro', { text: 'Changed' });
    expect(changed.ok && changed.document.theme).toEqual({ accent: 'purple', shape: 'soft' });

    const removed = removeNode(themed, 'intro');
    expect(removed.ok && removed.document.theme).toEqual({ accent: 'purple', shape: 'soft' });
  });

  it('is kept when the values that nothing uses are removed', () => {
    expect(pruneUnusedValues(themed).theme).toEqual({ accent: 'purple', shape: 'soft' });
  });
});

describe('pruneUnusedValues', () => {
  const withValues = (state: Record<string, unknown>, root: unknown) =>
    appDocumentSchema.parse({ state, root });

  const text = (key: string) => ({ type: 'string', default: key });

  it('keeps the value an input is bound to and the values a row click sets', () => {
    const document = withValues(
      { find: text('a'), service: text('b'), orphan: text('c') },
      {
        type: 'stack',
        id: 'root',
        children: [
          { type: 'search', id: 'box', label: 'Find', bind: 'find' },
          {
            type: 'table',
            id: 'table',
            query: 'ROW 1',
            onRowClick: [{ type: 'setState', key: 'service', value: { fromColumn: 'service' } }],
          },
        ],
      }
    );

    expect(Object.keys(pruneUnusedValues(document).state)).toEqual(['find', 'service']);
  });

  it('keeps the value of each field of a form, which is what a workflow it runs is given', () => {
    const document = withValues(
      { reason: text('a'), urgency: text('b'), orphan: text('c') },
      {
        type: 'form',
        id: 'ask',
        submitLabel: 'Send',
        fields: [
          { bind: 'reason', kind: 'text', label: 'Reason' },
          {
            bind: 'urgency',
            kind: 'select',
            label: 'Urgency',
            options: [{ value: 'low' }],
          },
        ],
      }
    );

    expect(Object.keys(pruneUnusedValues(document).state)).toEqual(['reason', 'urgency']);
  });

  it('keeps a value that filters the cases of a component, though no query uses it', () => {
    const document = withValues(
      { status: text('open'), orphan: text('c') },
      { type: 'table', id: 'cases', source: { type: 'cases', status: { fromState: 'status' } } }
    );

    expect(Object.keys(pruneUnusedValues(document).state)).toEqual(['status']);
  });

  it('keeps a value that a workflow is handed, so it is not pruned from under the button', () => {
    const document = withValues(
      { host: text('web-1'), orphan: text('c') },
      {
        type: 'button',
        id: 'go',
        label: 'Isolate',
        onClick: [
          { type: 'runWorkflow', workflow: 'isolate', inputs: { host: { fromState: 'host' } } },
        ],
      }
    );

    expect(Object.keys(pruneUnusedValues(document).state)).toEqual(['host']);
  });

  it('keeps a value set only by an action of an input, and one nested in a flyout', () => {
    const document = withValues(
      { a: text('x'), b: text('y'), c: text('z') },
      {
        type: 'stack',
        id: 'root',
        children: [
          {
            type: 'select',
            id: 'pick',
            label: 'Pick',
            bind: 'a',
            options: [{ value: 'x' }],
            onChange: [{ type: 'setState', key: 'b', value: { fromInput: true } }],
          },
          {
            type: 'flyout',
            id: 'f',
            title: 'F',
            children: [{ type: 'search', id: 'inner', label: 'Inner', bind: 'c' }],
          },
        ],
      }
    );

    expect(Object.keys(pruneUnusedValues(document).state)).toEqual(['a', 'b', 'c']);
  });

  it('removes a value once what set it is gone', () => {
    const document = withValues(
      { find: text('a') },
      {
        type: 'stack',
        id: 'root',
        children: [{ type: 'search', id: 'box', label: 'Find', bind: 'find' }],
      }
    );
    const without = succeeds(removeNode(document, 'box'));

    expect(pruneUnusedValues(without).state).toEqual({});
  });

  it('returns the same document when there is nothing to remove, and never alters its input', () => {
    const document = fixture();

    expect(pruneUnusedValues(document)).toBe(document);

    const orphaned = setStateDeclaration(document, 'orphan', { type: 'string', default: '' });
    const pruned = pruneUnusedValues(orphaned);
    expect(Object.keys(pruned.state)).toEqual(['service']);
    expect(Object.keys(orphaned.state)).toEqual(['service', 'orphan']);
  });
});

describe('the components that hold others', () => {
  const nested = appDocumentSchema.parse({
    root: {
      type: 'stack',
      id: 'root',
      children: [
        {
          type: 'tabs',
          id: 'tabs',
          children: [
            {
              type: 'section',
              id: 'one',
              label: 'One',
              children: [{ type: 'card', id: 'card', title: 'Card', children: [] }],
            },
          ],
        },
      ],
    },
  });

  it('take nodes added to them, however deep', () => {
    const result = addNode(nested, 'card', { type: 'heading', id: 'inside', text: 'Hi' });

    expect(result.ok).toBe(true);
    expect(result.ok && findNode(result.document.root, 'inside')?.parent?.id).toBe('card');
  });

  it('are changed, and have what is in them removed, wherever they are', () => {
    const changed = updateNode<'card'>(nested, 'card', { title: 'New' });
    expect(
      changed.ok && (findNode(changed.document.root, 'card')?.node as { title: string }).title
    ).toBe('New');

    const removed = removeNode(nested, 'one');
    expect(removed.ok && findNode(removed.document.root, 'card')).toBeUndefined();
  });

  it('are copied with everything in them, under new ids', () => {
    const result = duplicateNode(nested, 'one');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const copies = getNodeChildren(findNode(result.document.root, 'tabs')!.node);
    expect(copies).toHaveLength(2);
    expect(
      new Set(copies.flatMap((section) => getNodeChildren(section).map(({ id }) => id))).size
    ).toBe(2);
  });
});
