/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import { firstValueFrom } from 'rxjs';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { useKibana, useToasts } from '../../../../common/lib/kibana';
import { useCreateAttachments } from '../../../../containers/use_create_attachments';
import { useRefreshCaseViewPage } from '../../../case_view/use_on_refresh_case_view_page';
import { buildLensPayload } from '../build_lens_payload';
import { convertToAbsoluteTimeRange } from '../actions/convert_to_absolute_time_range';
import * as i18n from '../../common/saved_object/translations';
import { clearPendingLensAttach, getPendingLensAttach } from './storage';

interface UseConsumeLensReturnArgs {
  caseId: string;
}

/**
 * Mount on the case view to auto-attach a Lens visualization when the user
 * returns from the Lens editor via "Save and return". Reads the pending
 * marker written by `useOpenLensForAttach`, claims the incoming embeddable
 * package, and creates the attachment with the current global timefilter as
 * the snapshot's view time range.
 */
export const useConsumeLensReturn = ({ caseId }: UseConsumeLensReturnArgs): void => {
  const {
    services: {
      application: { currentAppId$ },
      contentManagement,
      data: dataService,
      embeddable,
      storage,
    },
  } = useKibana();
  const { timefilter } = dataService.query.timefilter;
  const toasts = useToasts();
  const refreshCaseViewPage = useRefreshCaseViewPage();
  const { mutateAsync: createAttachments } = useCreateAttachments();
  // Guards against the effect running twice in StrictMode and against
  // re-processing the same package within a single mount.
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (hasProcessedRef.current) {
      return;
    }
    const stateTransfer = embeddable?.getStateTransfer();
    if (!stateTransfer) {
      return;
    }

    // Only this hook owns the pending marker, so resolve its fate here.
    const pending = getPendingLensAttach(storage);
    if (!pending || pending.caseId !== caseId) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      const currentAppId = await firstValueFrom(currentAppId$, { defaultValue: undefined });
      if (cancelled || !currentAppId) {
        return;
      }

      const peeked = stateTransfer.getIncomingEmbeddablePackage(currentAppId, false);
      const lensPackage = peeked?.find((pkg) => pkg.type === LENS_EMBEDDABLE_TYPE);

      // No package means the user returned without saving. Clear the marker so
      // it can't suppress the markdown editor's incoming-state handling later.
      if (!lensPackage) {
        clearPendingLensAttach(storage);
        return;
      }

      hasProcessedRef.current = true;
      // Drain so a remount or sibling consumer can't re-process it.
      stateTransfer.getIncomingEmbeddablePackage(currentAppId, true);
      clearPendingLensAttach(storage);

      try {
        const attachment = await buildLensPayload({
          contentManagement,
          id: pending.savedObjectId,
          title: pending.title,
          timeRange: convertToAbsoluteTimeRange(timefilter.getTime()),
        });
        await createAttachments({
          caseId: pending.caseId,
          caseOwner: pending.caseOwner,
          attachments: [attachment],
        });
        if (cancelled) {
          return;
        }
        toasts.addSuccess({
          title: i18n.ATTACH_SUCCESS_TITLE,
          text: pending.title,
        });
        refreshCaseViewPage();
      } catch {
        // `useCreateAttachments` surfaces its own error toast.
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [
    caseId,
    contentManagement,
    createAttachments,
    currentAppId$,
    embeddable,
    refreshCaseViewPage,
    storage,
    timefilter,
    toasts,
  ]);
};
