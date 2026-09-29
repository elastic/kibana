/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { of } from 'rxjs';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';

import { LensEditor } from './plugin';
import { useCasesConfig, useKibana, useToasts } from '../../../../common/lib/kibana';
import { useMarkdownEditorPluginClickedEBT } from '../../../../analytics/use_markdown_editor_ebt';
import { useLensDraftComment } from './use_lens_draft_comment';
import { useIsMainApplication } from '../../../../common/hooks';
import { getPendingLensAttach } from '../../../attachments/lens/lens_return/storage';
import {
  FAILED_TO_LOAD_VISUALIZATION,
  SEARCH_INPUT_HELP_TEXT,
  SEARCH_INPUT_HELP_TEXT_WITH_ATTACH_HINT,
} from './translations';

vi.mock('../../../../common/lib/kibana');
vi.mock('../../../../analytics/use_markdown_editor_ebt');
vi.mock('./use_lens_draft_comment');
vi.mock('../../../../common/hooks');
vi.mock('../../../attachments/lens/lens_return/storage');
vi.mock('react-router-dom', () => {
      const mocked = {
      useLocation: () => ({ pathname: '/', search: '' }),
    };
      return { ...mocked, default: mocked };
    });
vi.mock('@kbn/saved-objects-finder-plugin/public', () => {
      const mocked = {
      SavedObjectFinder: ({
        onChoose,
        helpText,
      }: {
        onChoose: (
          id: string,
          type: string,
          fullName: string,
          savedObject: { attributes: unknown; references: unknown[] }
        ) => void;
        helpText?: string;
      }) => (
        <div>
          <div data-test-subj="saved-object-finder-help">{helpText}</div>
          <button
            type="button"
            data-test-subj="choose-lens-so"
            onClick={() =>
              onChoose('so-1', 'lens', 'Chart', {
                attributes: { title: 'Chosen viz', type: 'lens' },
                references: [],
              })
            }
          >
            {'choose'}
          </button>
        </div>
      ),
    };
      return { ...mocked, default: mocked };
    });

const trackMarkdownEditorPluginClicked = vi.fn();
const navigateToPrefilledEditor = vi.fn();
const getIncomingEmbeddablePackage = vi.fn();
const contentManagementGet = vi.fn();
const getTime = vi.fn();
const onSave = vi.fn();
const onCancel = vi.fn();
const clearDraftComment = vi.fn();
const addDanger = vi.fn();

const renderEditor = async (node?: unknown) => {
  const view = render(
    <I18nProvider>
      <LensEditor node={node as never} onSave={onSave} onCancel={onCancel} />
    </I18nProvider>
  );
  await act(async () => {
    await Promise.resolve();
  });
  return view;
};

describe('lens markdown plugin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getIncomingEmbeddablePackage.mockReturnValue(undefined);
    contentManagementGet.mockReset();
    getTime.mockReturnValue({});
    (useMarkdownEditorPluginClickedEBT as Mock).mockReturnValue(
      trackMarkdownEditorPluginClicked
    );
    (useLensDraftComment as Mock).mockReturnValue({
      draftComment: undefined,
      clearDraftComment,
    });
    (useIsMainApplication as Mock).mockReturnValue(false);
    (getPendingLensAttach as Mock).mockReturnValue(false);
    (useCasesConfig as Mock).mockReturnValue({
      attachmentsEnabled: false,
    });
    (useToasts as Mock).mockReturnValue({ addDanger });
    (useKibana as Mock).mockReturnValue({
      services: {
        application: { currentAppId$: of('cases') },
        embeddable: {
          getStateTransfer: () => ({ getIncomingEmbeddablePackage }),
        },
        lens: { navigateToPrefilledEditor },
        storage: { set: vi.fn(), get: vi.fn() },
        contentManagement: { client: { get: contentManagementGet } },
        uiSettings: {},
        data: { query: { timefilter: { timefilter: { getTime } } } },
        notifications: { toasts: { addDanger } },
      },
    });
  });

  it('reports the lens markdown plugin click on toolbar insert (no node)', async () => {
    await renderEditor();

    expect(trackMarkdownEditorPluginClicked).toHaveBeenCalledWith('lens');
  });

  it('does not report when editing an existing lens block (node defined)', async () => {
    await renderEditor({ position: { start: {}, end: {} } });

    expect(trackMarkdownEditorPluginClicked).not.toHaveBeenCalled();
  });

  it('shows comment-scoped help text when attachments are disabled', async () => {
    await renderEditor();

    expect(screen.getByTestId('saved-object-finder-help')).toHaveTextContent(
      SEARCH_INPUT_HELP_TEXT
    );
  });

  it('points users at Attach when attachments are enabled', async () => {
    (useCasesConfig as Mock).mockReturnValue({ attachmentsEnabled: true });
    await renderEditor();

    expect(screen.getByTestId('saved-object-finder-help')).toHaveTextContent(
      SEARCH_INPUT_HELP_TEXT_WITH_ATTACH_HINT
    );
  });

  it('inserts a chosen saved object into the comment without opening the lens editor', async () => {
    getTime.mockReturnValue({ from: 'now-7d', to: 'now' });
    await renderEditor();

    fireEvent.click(screen.getByTestId('choose-lens-so'));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toContain('Chosen viz');
    expect(navigateToPrefilledEditor).not.toHaveBeenCalled();
  });

  it('inserts incoming by-value lens attributes into the comment', async () => {
    (useLensDraftComment as Mock).mockReturnValue({
      draftComment: { commentId: 'c1', comment: 'draft' },
      clearDraftComment,
    });
    getIncomingEmbeddablePackage.mockImplementation((_appId: string, drain?: boolean) =>
      drain
        ? undefined
        : [
            {
              type: LENS_EMBEDDABLE_TYPE,
              serializedState: { attributes: { title: 'By value', type: 'lens' } },
            },
          ]
    );

    await renderEditor();

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
    });
    expect(onSave.mock.calls[0][0]).toContain('By value');
    expect(contentManagementGet).not.toHaveBeenCalled();
  });

  it('resolves incoming ref_id via content management and inserts into the comment', async () => {
    (useLensDraftComment as Mock).mockReturnValue({
      draftComment: { commentId: 'c1', comment: 'draft' },
      clearDraftComment,
    });
    getIncomingEmbeddablePackage.mockImplementation((_appId: string, drain?: boolean) =>
      drain ? undefined : [{ type: LENS_EMBEDDABLE_TYPE, serializedState: { ref_id: 'lens-so-1' } }]
    );
    contentManagementGet.mockResolvedValue({
      item: {
        attributes: { title: 'From SO', type: 'lens' },
        references: [{ type: 'index-pattern', id: 'idx', name: 'idx' }],
      },
    });

    await renderEditor();

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
    });
    expect(contentManagementGet).toHaveBeenCalledWith({
      contentTypeId: 'lens',
      id: 'lens-so-1',
    });
    expect(onSave.mock.calls[0][0]).toContain('From SO');
    expect(getIncomingEmbeddablePackage).toHaveBeenCalledWith('cases', true);
  });

  it('does not drain the incoming package when content management resolve fails', async () => {
    (useLensDraftComment as Mock).mockReturnValue({
      draftComment: { commentId: 'c1', comment: 'draft' },
      clearDraftComment,
    });
    getIncomingEmbeddablePackage.mockImplementation((_appId: string, drain?: boolean) =>
      drain ? undefined : [{ type: LENS_EMBEDDABLE_TYPE, serializedState: { ref_id: 'lens-so-1' } }]
    );
    contentManagementGet.mockRejectedValue(new Error('cm down'));

    await renderEditor();

    await waitFor(() => {
      expect(addDanger).toHaveBeenCalledWith({ title: FAILED_TO_LOAD_VISUALIZATION });
    });
    expect(contentManagementGet).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
    expect(getIncomingEmbeddablePackage.mock.calls.some(([, drain]) => drain === true)).toBe(false);
  });

  it('updates the existing block when a draft position is set and the incoming package resolves by-value', async () => {
    (useLensDraftComment as Mock).mockReturnValue({
      draftComment: { commentId: 'c1', comment: 'draft', position: { start: {}, end: {} } },
      clearDraftComment,
    });
    getIncomingEmbeddablePackage.mockImplementation((_appId: string, drain?: boolean) =>
      drain
        ? undefined
        : [
            {
              type: LENS_EMBEDDABLE_TYPE,
              serializedState: { attributes: { title: 'Updated viz', type: 'lens' } },
            },
          ]
    );

    const markdownContextValue = { replaceNode: vi.fn() };
    const { EuiMarkdownContext } = (await vi.importActual('@elastic/eui'));
    render(
      <I18nProvider>
        <EuiMarkdownContext.Provider value={markdownContextValue}>
          <LensEditor node={undefined as never} onSave={onSave} onCancel={onCancel} />
        </EuiMarkdownContext.Provider>
      </I18nProvider>
    );
    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(markdownContextValue.replaceNode).toHaveBeenCalled();
    });
    expect(markdownContextValue.replaceNode.mock.calls[0][1]).toContain('Updated viz');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('resolves an incoming by-ref draft update via content management', async () => {
    (useLensDraftComment as Mock).mockReturnValue({
      draftComment: { commentId: 'c1', comment: 'draft', position: { start: {}, end: {} } },
      clearDraftComment,
    });
    getIncomingEmbeddablePackage.mockImplementation((_appId: string, drain?: boolean) =>
      drain ? undefined : [{ type: LENS_EMBEDDABLE_TYPE, serializedState: { ref_id: 'lens-so-2' } }]
    );
    contentManagementGet.mockResolvedValue({
      item: { attributes: { title: 'Updated from SO', type: 'lens' }, references: [] },
    });

    const markdownContextValue = { replaceNode: vi.fn() };
    const { EuiMarkdownContext } = (await vi.importActual('@elastic/eui'));
    render(
      <I18nProvider>
        <EuiMarkdownContext.Provider value={markdownContextValue}>
          <LensEditor node={undefined as never} onSave={onSave} onCancel={onCancel} />
        </EuiMarkdownContext.Provider>
      </I18nProvider>
    );
    await act(async () => {
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(markdownContextValue.replaceNode).toHaveBeenCalled();
    });
    expect(contentManagementGet).toHaveBeenCalledWith({
      contentTypeId: 'lens',
      id: 'lens-so-2',
    });
    expect(markdownContextValue.replaceNode.mock.calls[0][1]).toContain('Updated from SO');
    expect(onSave).not.toHaveBeenCalled();
  });
});
