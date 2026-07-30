/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiMarkdownAstNodePosition } from '@elastic/eui';
import { useCallback, useEffect, useState } from 'react';
import { first } from 'rxjs';
import { useKibana } from '../../../../common/lib/kibana';
import { DRAFT_COMMENT_STORAGE_ID } from './constants';
import { VISUALIZATION } from './translations';
import { getPendingLensAttach } from '../../../attachments/lens/lens_return/storage';
import type { MarkdownEditorRef } from '../../types';

interface DraftComment {
  commentId: string;
  comment: string;
  position: EuiMarkdownAstNodePosition;
  caseTitle?: string;
  caseTags?: string[];
}

export const useLensDraftComment = () => {
  const {
    application: { currentAppId$ },
    embeddable,
    storage,
  } = useKibana().services;
  const [draftComment, setDraftComment] = useState<DraftComment | null>(null);
  const [hasIncomingLensState, setHasIncomingLensState] = useState(false);

  useEffect(() => {
    const fetchDraftComment = async () => {
      const currentAppId = await currentAppId$.pipe(first()).toPromise();

      if (!currentAppId) {
        return;
      }

      // A pending SO-attach marker means the incoming Lens package belongs to
      // the "Open in Lens -> Save and return -> auto attach" round trip, not
      // the markdown editor. Ignore it here so the markdown flow doesn't claim
      // the package (which would reopen the "Add visualization" modal and race
      // the SO-attach consumer for the same package).
      if (getPendingLensAttach(storage)) {
        return;
      }

      const incomingEmbeddablePackage = embeddable
        ?.getStateTransfer()
        .getIncomingEmbeddablePackage(currentAppId);
      const storageDraftComment = storage.get(DRAFT_COMMENT_STORAGE_ID);

      setHasIncomingLensState(!!incomingEmbeddablePackage);

      if (storageDraftComment) {
        setDraftComment(storageDraftComment);
      }
    };
    fetchDraftComment();
  }, [currentAppId$, embeddable, storage]);

  const openLensModal = useCallback(({ editorRef }: { editorRef: MarkdownEditorRef }) => {
    if (editorRef && editorRef.textarea && editorRef.toolbar) {
      const lensPluginButton = editorRef.toolbar?.querySelector<HTMLButtonElement>(
        `[aria-label="${VISUALIZATION}"]`
      );
      if (lensPluginButton) {
        lensPluginButton.click();
      }
    }
  }, []);

  const clearDraftComment = useCallback(() => {
    storage.remove(DRAFT_COMMENT_STORAGE_ID);
    setDraftComment(null);
  }, [storage]);

  return { draftComment, hasIncomingLensState, openLensModal, clearDraftComment };
};
