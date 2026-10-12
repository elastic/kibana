/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { openLazyFlyout } from '@kbn/presentation-util';
import { appDocumentSchema, type AppDocument } from '@kbn/custom-app-common';
import type { CustomAppEmbeddableState } from '../server';
import { customAppEmbeddableFactory } from './custom_app_embeddable';

jest.mock('./services', () => ({
  getServices: () => ({ core: { http: {} }, search: jest.fn() }),
}));
jest.mock('./data/run_esql_query', () => ({
  createRunEsqlQuery: () => async () => ({ columns: [], rows: [] }),
}));
jest.mock('@kbn/presentation-util', () => ({ openLazyFlyout: jest.fn() }));

const documentWith = (heading: string): AppDocument =>
  appDocumentSchema.parse({
    root: {
      type: 'stack',
      id: 'root',
      children: [{ type: 'heading', id: 'title', text: heading }],
    },
  });

const SAVED = documentWith('Saved heading');

const build = async () => {
  const initialState: CustomAppEmbeddableState = { version: 1, document: SAVED };
  const { api, Component } = await customAppEmbeddableFactory.buildEmbeddable({
    initialState,
    finalizeApi: (registration: unknown) => registration,
    parentApi: {},
    uuid: 'panel-1',
  } as never);
  render(<Component />);
  return api as unknown as {
    onEdit: () => Promise<void>;
    serializeState: () => CustomAppEmbeddableState;
    getDocument: () => AppDocument;
    anyStateChange$: { subscribe: (next: () => void) => { unsubscribe: () => void } };
  };
};

/** Opens the editor, and returns what it was given and the controls the test needs. */
const openEditor = async (api: Awaited<ReturnType<typeof build>>) => {
  let closeFlyoutRef: () => void = () => {};
  const closeFlyout = jest.fn();
  (openLazyFlyout as jest.Mock).mockReturnValue({
    onClose: new Promise<void>((resolve) => {
      closeFlyoutRef = resolve;
    }),
  });

  await api.onEdit();

  const { loadContent, flyoutProps } = (openLazyFlyout as jest.Mock).mock.calls[0][0];
  const element = await loadContent({ closeFlyout, ariaLabelledBy: 'title-id' });
  return {
    flyoutProps,
    editorProps: element.props,
    closeFlyout,
    /** The flyout going away, however it was closed. */
    flyoutClosed: () => act(async () => closeFlyoutRef()),
  };
};

describe('the custom app panel', () => {
  beforeEach(() => (openLazyFlyout as jest.Mock).mockReset());

  it('shows its saved document', async () => {
    await build();

    expect(screen.getByRole('heading', { name: 'Saved heading' })).toBeInTheDocument();
  });

  it('keeps the app inside a frame, so it has room around it in the panel', async () => {
    await build();

    expect(screen.getByTestId('customAppFrame')).toContainElement(
      screen.getByRole('heading', { name: 'Saved heading' })
    );
  });

  describe('offering its document to whatever wants to look at it', () => {
    it('gives the saved document', async () => {
      const api = await build();

      expect(api.getDocument()).toBe(SAVED);
    });

    it('gives the saved document, not the preview, while the editor is previewing', async () => {
      const api = await build();
      const { editorProps } = await openEditor(api);

      act(() => editorProps.onPreview(documentWith('Draft heading')));

      expect(api.getDocument()).toBe(SAVED);
    });

    it('gives the new document once an edit has been saved', async () => {
      const api = await build();
      const { editorProps } = await openEditor(api);
      const edited = documentWith('Edited heading');

      act(() => editorProps.onSave(edited));

      expect(api.getDocument()).toBe(edited);
    });
  });

  describe('editing', () => {
    it('opens the editor from the document it has, as a flyout beside the dashboard', async () => {
      const api = await build();

      const { flyoutProps, editorProps } = await openEditor(api);

      expect(editorProps.initialDocument).toBe(SAVED);
      expect(editorProps.ariaLabelledBy).toBe('title-id');
      // No explicit type: it is up to the dashboard, which makes it a push flyout by default.
      expect(flyoutProps.type).toBeUndefined();
      expect(flyoutProps.focusedPanelId).toBe('panel-1');
    });

    it('shows a preview of the draft on the panel itself, without changing what is saved', async () => {
      const api = await build();
      const { editorProps } = await openEditor(api);

      act(() => editorProps.onPreview(documentWith('Draft heading')));

      expect(await screen.findByRole('heading', { name: 'Draft heading' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Saved heading' })).not.toBeInTheDocument();
      expect(api.serializeState().document).toBe(SAVED);
    });

    it('does not report a change to the panel while previewing', async () => {
      const api = await build();
      const changed = jest.fn();
      api.anyStateChange$.subscribe(changed);
      const { editorProps } = await openEditor(api);

      act(() => editorProps.onPreview(documentWith('Draft heading')));
      act(() => editorProps.onPreview(documentWith('Another draft')));

      expect(changed).not.toHaveBeenCalled();
    });

    it('follows each new preview', async () => {
      const api = await build();
      const { editorProps } = await openEditor(api);

      act(() => editorProps.onPreview(documentWith('First')));
      expect(await screen.findByRole('heading', { name: 'First' })).toBeInTheDocument();

      act(() => editorProps.onPreview(documentWith('Second')));
      expect(await screen.findByRole('heading', { name: 'Second' })).toBeInTheDocument();
    });

    it('goes back to the saved document when the editor closes, however it closes', async () => {
      const api = await build();
      const { editorProps, flyoutClosed } = await openEditor(api);
      act(() => editorProps.onPreview(documentWith('Draft heading')));
      expect(await screen.findByRole('heading', { name: 'Draft heading' })).toBeInTheDocument();

      await flyoutClosed();

      expect(await screen.findByRole('heading', { name: 'Saved heading' })).toBeInTheDocument();
      expect(api.serializeState().document).toBe(SAVED);
    });

    it('saves the draft as the panel, and closes the editor', async () => {
      const api = await build();
      const { editorProps, closeFlyout, flyoutClosed } = await openEditor(api);
      const edited = documentWith('Edited heading');
      const changed = jest.fn();
      api.anyStateChange$.subscribe(changed);

      act(() => editorProps.onSave(edited));
      await flyoutClosed();

      expect(closeFlyout).toHaveBeenCalledTimes(1);
      expect(api.serializeState().document).toBe(edited);
      expect(changed).toHaveBeenCalled();
      expect(await screen.findByRole('heading', { name: 'Edited heading' })).toBeInTheDocument();
    });

    it('closes the editor on cancel and leaves the panel as it was', async () => {
      const api = await build();
      const { editorProps, closeFlyout } = await openEditor(api);

      editorProps.onCancel();

      expect(closeFlyout).toHaveBeenCalledTimes(1);
      expect(api.serializeState().document).toBe(SAVED);
    });

    it('keeps a value the author saved while previewing, since the preview is cleared after', async () => {
      const api = await build();
      const { editorProps, flyoutClosed } = await openEditor(api);
      const edited = documentWith('Edited heading');

      act(() => editorProps.onPreview(edited));
      act(() => editorProps.onSave(edited));
      await flyoutClosed();

      expect(await screen.findByRole('heading', { name: 'Edited heading' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Saved heading' })).not.toBeInTheDocument();
    });
  });
});
