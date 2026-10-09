/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { of } from 'rxjs';
import { render } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { LensEditor } from './plugin';
import { useKibana } from '../../../../common/lib/kibana';
import { useMarkdownEditorPluginClickedEBT } from '../../../../analytics/use_markdown_editor_ebt';
import { useLensDraftComment } from './use_lens_draft_comment';
import { useIsMainApplication } from '../../../../common/hooks';
import { getPendingLensAttach } from '../../../attachments/lens/lens_return/storage';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../../../analytics/use_markdown_editor_ebt');
jest.mock('./use_lens_draft_comment');
jest.mock('../../../../common/hooks');
jest.mock('../../../attachments/lens/lens_return/storage');
jest.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/', search: '' }),
}));
jest.mock('@kbn/saved-objects-finder-plugin/public', () => ({
  SavedObjectFinder: () => <div data-test-subj="saved-object-finder-mock" />,
}));

const trackMarkdownEditorPluginClicked = jest.fn();

const renderEditor = (node?: unknown) =>
  render(
    <I18nProvider>
      <LensEditor node={node as never} onSave={jest.fn()} onCancel={jest.fn()} />
    </I18nProvider>
  );

describe('lens markdown plugin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useMarkdownEditorPluginClickedEBT as jest.Mock).mockReturnValue(
      trackMarkdownEditorPluginClicked
    );
    (useLensDraftComment as jest.Mock).mockReturnValue({
      draftComment: undefined,
      clearDraftComment: jest.fn(),
    });
    (useIsMainApplication as jest.Mock).mockReturnValue(false);
    (getPendingLensAttach as jest.Mock).mockReturnValue(false);
    (useKibana as jest.Mock).mockReturnValue({
      services: {
        application: { currentAppId$: of(undefined) },
        embeddable: {
          getStateTransfer: () => ({ getIncomingEmbeddablePackage: () => undefined }),
        },
        lens: { navigateToPrefilledEditor: jest.fn() },
        storage: { set: jest.fn(), get: jest.fn() },
        contentManagement: { client: {} },
        uiSettings: {},
        data: { query: { timefilter: { timefilter: { getTime: () => ({}) } } } },
      },
    });
  });

  it('reports the lens markdown plugin click on toolbar insert (no node)', () => {
    renderEditor();

    expect(trackMarkdownEditorPluginClicked).toHaveBeenCalledWith('lens');
  });

  it('does not report when editing an existing lens block (node defined)', () => {
    renderEditor({ position: { start: {}, end: {} } });

    expect(trackMarkdownEditorPluginClicked).not.toHaveBeenCalled();
  });
});
