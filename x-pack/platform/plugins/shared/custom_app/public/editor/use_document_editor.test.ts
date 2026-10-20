/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import {
  appDocumentSchema,
  findNode,
  getNodeChildren,
  setStateDeclaration,
  type AppDocument,
} from '@kbn/custom-app-common';
import { useDocumentEditor } from './use_document_editor';

const initialDocument = (): AppDocument =>
  appDocumentSchema.parse({
    state: { service: { type: 'string', default: '' } },
    root: {
      type: 'stack',
      id: 'root',
      children: [
        { type: 'heading', id: 'title', text: 'Title' },
        { type: 'stack', id: 'group', children: [{ type: 'text', id: 'note', text: 'Note' }] },
      ],
    },
  });

const setup = () => {
  const initial = initialDocument();
  const hook = renderHook(() => useDocumentEditor(initial));
  const childIds = (id: string) =>
    getNodeChildren(findNode(hook.result.current.document.root, id)!.node).map((node) => node.id);
  return { hook, initial, childIds };
};

describe('useDocumentEditor', () => {
  it('starts on the root with a valid, unmodified document', () => {
    const { hook, initial } = setup();

    expect(hook.result.current.selectedId).toBe('root');
    expect(hook.result.current.document).toBe(initial);
    expect(hook.result.current.issues).toEqual([]);
    expect(hook.result.current.isDirty).toBe(false);
    expect(hook.result.current.canUndo).toBe(false);
  });

  describe('add', () => {
    it('adds into the selected container and selects the new node', () => {
      const { hook, childIds } = setup();

      act(() => hook.result.current.select('group'));
      act(() => {
        hook.result.current.add('text');
      });

      expect(childIds('group')).toEqual(['note', 'text-1']);
      expect(hook.result.current.selectedId).toBe('text-1');
      expect(hook.result.current.isDirty).toBe(true);
    });

    it('adds beside a selected leaf, into the same container', () => {
      const { hook, childIds } = setup();

      act(() => hook.result.current.select('note'));
      act(() => {
        hook.result.current.add('callout');
      });

      expect(childIds('group')).toEqual(['note', 'callout-1']);
    });

    it('can add to a chosen container whatever is selected', () => {
      const { hook, childIds } = setup();

      act(() => {
        hook.result.current.add('heading', 'group');
      });

      expect(childIds('group')).toEqual(['note', 'heading-1']);
    });

    it('gives a new data component a query that runs anywhere', () => {
      const { hook } = setup();

      act(() => {
        hook.result.current.add('table');
      });

      expect(findNode(hook.result.current.document.root, 'table-1')!.node).toMatchObject({
        query: 'ROW value = 1',
      });
      expect(hook.result.current.issues).toEqual([]);
    });

    describe('an input', () => {
      it('sets a value made with it, named after what it is called', () => {
        const { hook } = setup();

        act(() => {
          hook.result.current.add('select');
        });

        const { document } = hook.result.current;
        expect(findNode(document.root, 'select-1')!.node).toMatchObject({ bind: 'filter' });
        expect(document.state.filter).toEqual({ type: 'string', default: 'option-1' });
        expect(hook.result.current.issues).toEqual([]);
      });

      it('starts a search box empty, and a button group on its first option', () => {
        const { hook } = setup();

        act(() => {
          hook.result.current.add('search');
        });
        act(() => {
          hook.result.current.add('button_group');
        });

        const { state } = hook.result.current.document;
        expect(state.search).toEqual({ type: 'string', default: '' });
        expect(state.view).toEqual({ type: 'string', default: 'option-1' });
      });

      it('is a form that asks one question, whose answer is a value made with it', () => {
        const { hook } = setup();

        act(() => {
          hook.result.current.add('form');
        });

        const { document } = hook.result.current;
        expect(findNode(document.root, 'form-1')!.node).toMatchObject({
          submitLabel: 'Submit',
          fields: [{ bind: 'question_1', kind: 'text' }],
        });
        expect(document.state.question_1).toEqual({ type: 'string', default: '' });
        expect(hook.result.current.issues).toEqual([]);
      });

      it('gets a value of its own even when another input has the same name', () => {
        const { hook } = setup();

        act(() => {
          hook.result.current.add('select');
        });
        act(() => {
          hook.result.current.add('select');
        });

        const { document } = hook.result.current;
        expect(findNode(document.root, 'select-1')!.node).toMatchObject({ bind: 'filter' });
        expect(findNode(document.root, 'select-2')!.node).toMatchObject({ bind: 'filter_2' });
      });

      it('takes its value with it when it is removed, and brings it back with undo', () => {
        const { hook } = setup();
        act(() => {
          hook.result.current.add('search');
        });
        expect(Object.keys(hook.result.current.document.state)).toEqual(['search']);

        act(() => {
          hook.result.current.removeSelected();
        });
        expect(hook.result.current.document.state).toEqual({});

        act(() => hook.result.current.undo());
        expect(Object.keys(hook.result.current.document.state)).toEqual(['search']);
      });
    });

    it('does not keep a value that nothing sets', () => {
      const { hook } = setup();

      act(() => {
        hook.result.current.add('text');
      });

      // The starting document declared "service" but nothing sets it.
      expect(hook.result.current.document.state).toEqual({});
    });

    it.each(['stat', 'table', 'key_value'] as const)(
      'starts a new %s with a query of its own',
      (type) => {
        const { hook } = setup();

        act(() => {
          hook.result.current.add(type);
        });

        expect(findNode(hook.result.current.document.root, `${type}-1`)!.node).toMatchObject({
          query: 'ROW value = 1',
        });
      }
    );

    it('keeps the query of one data component apart from another', () => {
      const { hook } = setup();
      act(() => {
        hook.result.current.add('stat');
      });
      act(() => {
        hook.result.current.add('table');
      });

      act(() => {
        hook.result.current.update<'table'>('table-1', { query: 'FROM changed' });
      });

      const { document } = hook.result.current;
      expect(findNode(document.root, 'table-1')!.node).toMatchObject({ query: 'FROM changed' });
      expect(findNode(document.root, 'stat-1')!.node).toMatchObject({ query: 'ROW value = 1' });
    });

    it('numbers several of a kind apart', () => {
      const { hook, childIds } = setup();

      act(() => {
        hook.result.current.add('text');
      });
      act(() => {
        hook.result.current.add('text');
      });

      expect(childIds('root')).toEqual(['title', 'group', 'text-1', 'text-2']);
    });
  });

  describe('remove, duplicate, move', () => {
    it('removes the selection and selects its parent', () => {
      const { hook, childIds } = setup();

      act(() => hook.result.current.select('note'));
      act(() => {
        hook.result.current.removeSelected();
      });

      expect(childIds('group')).toEqual([]);
      expect(hook.result.current.selectedId).toBe('group');
    });

    it('refuses to remove the root', () => {
      const { hook } = setup();

      let result;
      act(() => {
        result = hook.result.current.removeSelected();
      });

      expect(result).toEqual({ ok: false, reason: 'The root cannot be removed' });
      expect(hook.result.current.isDirty).toBe(false);
    });

    it('duplicates the selection and selects the copy', () => {
      const { hook, childIds } = setup();

      act(() => hook.result.current.select('note'));
      act(() => {
        hook.result.current.duplicateSelected();
      });

      expect(childIds('group')).toEqual(['note', 'text-1']);
      expect(hook.result.current.selectedId).toBe('text-1');
    });

    it('moves the selection up and down among its siblings, and stops at the ends', () => {
      const { hook, childIds } = setup();
      act(() => hook.result.current.select('group'));

      act(() => {
        hook.result.current.moveSelected('up');
      });
      expect(childIds('root')).toEqual(['group', 'title']);

      act(() => {
        hook.result.current.moveSelected('up');
      });
      expect(childIds('root')).toEqual(['group', 'title']);
      expect(hook.result.current.canUndo).toBe(true);

      act(() => {
        hook.result.current.moveSelected('down');
      });
      expect(childIds('root')).toEqual(['title', 'group']);
    });

    it('does not record a move that changes nothing', () => {
      const { hook } = setup();
      act(() => hook.result.current.select('title'));

      act(() => {
        hook.result.current.moveSelected('up');
      });

      expect(hook.result.current.canUndo).toBe(false);
    });
  });

  describe('update', () => {
    it('changes a property', () => {
      const { hook } = setup();

      act(() => {
        hook.result.current.update<'heading'>('title', { text: 'Renamed' });
      });

      expect(findNode(hook.result.current.document.root, 'title')!.node).toMatchObject({
        text: 'Renamed',
      });
    });

    it('undoes a run of typing in one field as a single step', () => {
      const { hook } = setup();

      ['N', 'Ne', 'New'].forEach((text) => {
        act(() => {
          hook.result.current.update<'heading'>('title', { text });
        });
      });
      act(() => hook.result.current.undo());

      expect(findNode(hook.result.current.document.root, 'title')!.node).toMatchObject({
        text: 'Title',
      });
      expect(hook.result.current.canUndo).toBe(false);
    });

    it('reports a field that is not valid yet without losing it', () => {
      const { hook } = setup();
      act(() => {
        hook.result.current.add('stat');
      });

      act(() => {
        hook.result.current.update<'stat'>('stat-1', { query: '' });
      });

      expect(hook.result.current.issues).toEqual([
        expect.objectContaining({ nodeId: 'stat-1', message: expect.stringContaining('query') }),
      ]);
    });
  });

  describe('edit', () => {
    it('applies an edit to the document, and can undo it', () => {
      const { hook } = setup();
      act(() => {
        hook.result.current.add('search');
      });

      act(() =>
        hook.result.current.edit((document) =>
          setStateDeclaration(document, 'search', { type: 'string', default: 'checkout' })
        )
      );
      expect(hook.result.current.document.state.search).toEqual({
        type: 'string',
        default: 'checkout',
      });

      act(() => hook.result.current.undo());
      expect(hook.result.current.document.state.search).toEqual({ type: 'string', default: '' });
    });
  });

  describe('undo and redo', () => {
    it('steps back and forward, and is clean again after undoing everything', () => {
      const { hook, initial } = setup();

      act(() => {
        hook.result.current.add('text');
      });
      act(() => {
        hook.result.current.add('callout');
      });
      expect(hook.result.current.canUndo).toBe(true);

      act(() => hook.result.current.undo());
      act(() => hook.result.current.undo());
      expect(hook.result.current.document).toBe(initial);
      expect(hook.result.current.isDirty).toBe(false);
      expect(hook.result.current.canRedo).toBe(true);

      act(() => hook.result.current.redo());
      expect(findNode(hook.result.current.document.root, 'text-1')).toBeDefined();
      expect(findNode(hook.result.current.document.root, 'callout-1')).toBeUndefined();
    });
  });
});
