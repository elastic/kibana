/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flattenPanelTree } from './flatten_panel_tree';

type PanelTree = Parameters<typeof flattenPanelTree>[0];

const findPanel = (panels: ReturnType<typeof flattenPanelTree>, id: number) => {
  const panel = panels.find((p) => p.id === id);
  if (!panel) {
    throw new Error(`Missing panel with id ${id}`);
  }
  return panel;
};

describe('flatten_panel_tree', () => {
  test('flattens a single panel with no items', () => {
    const tree: PanelTree = { id: 0 };
    const panels = flattenPanelTree(tree);

    expect(panels).toHaveLength(1);
    expect(panels[0]).toEqual({ id: 0 });
  });

  test('flattens nested panels and rewrites item.panel objects to ids', () => {
    const tree: PanelTree = {
      id: 0,
      title: 'root',
      items: [
        {
          name: 'Go to child',
          panel: {
            id: 1,
            title: 'child',
            items: [{ name: 'Leaf item' }],
          },
        },
      ],
    };

    const panels = flattenPanelTree(tree);

    const root = findPanel(panels, 0);
    const child = findPanel(panels, 1);

    expect(root.items?.[0]).toMatchObject({ name: 'Go to child', panel: 1 });
    expect(child.items?.[0]).toMatchObject({ name: 'Leaf item' });

    // The input tree is not mutated
    const originalPanel =
      tree.items?.[0] && 'panel' in tree.items[0] ? tree.items[0].panel : undefined;
    expect(typeof originalPanel).toBe('object');
    expect(originalPanel).toMatchObject({ id: 1 });
  });

  test('preserves separators and custom render items', () => {
    const tree: PanelTree = {
      id: 0,
      items: [
        { isSeparator: true },
        { renderItem: () => 'custom' },
        { name: 'Child', panel: { id: 2, items: [{ name: 'Nested' }] } },
      ],
    };

    const panels = flattenPanelTree(tree);
    const root = findPanel(panels, 0);

    expect(root.items?.[0]).toMatchObject({ isSeparator: true });
    expect(root.items?.[1]).toMatchObject({ renderItem: expect.any(Function) });
    expect(root.items?.[2]).toMatchObject({ name: 'Child', panel: 2 });
    expect(findPanel(panels, 2).items?.[0]).toMatchObject({ name: 'Nested' });
  });

  test('does not rewrite numeric panel references', () => {
    const tree: PanelTree = {
      id: 0,
      items: [{ name: 'Go', panel: 2 }],
    };

    const panels = flattenPanelTree(tree);
    const root = findPanel(panels, 0);
    expect(root.items?.[0]).toMatchObject({ panel: 2 });
  });

  test('flattens multiple nested branches', () => {
    const tree: PanelTree = {
      id: 0,
      items: [
        { name: 'A', panel: { id: 1, items: [{ name: 'A1' }] } },
        {
          name: 'B',
          panel: {
            id: 2,
            items: [{ name: 'B1', panel: { id: 3, items: [{ name: 'B2' }] } }],
          },
        },
      ],
    };

    const panels = flattenPanelTree(tree);

    expect(findPanel(panels, 0).items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'A', panel: 1 }),
        expect.objectContaining({ name: 'B', panel: 2 }),
      ])
    );
    expect(findPanel(panels, 1).items?.[0]).toMatchObject({ name: 'A1' });
    expect(findPanel(panels, 2).items?.[0]).toMatchObject({ name: 'B1', panel: 3 });
    expect(findPanel(panels, 3).items?.[0]).toMatchObject({ name: 'B2' });
  });
});
