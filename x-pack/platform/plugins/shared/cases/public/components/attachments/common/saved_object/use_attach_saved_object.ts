/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import {
  DASHBOARD_SO_TYPE,
  LENS_SO_TYPE,
  MAP_SO_TYPE,
} from '../../../../../common/constants/attachments';
import type { DashboardPayload } from '../../dashboard/build_dashboard_payload';
import { buildDashboardPayload } from '../../dashboard/build_dashboard_payload';
import type { MapPayload } from '../../map/build_map_payload';
import { buildMapPayload } from '../../map/build_map_payload';
import type { LensPayload } from '../../lens/build_lens_payload';
import { buildLensPayload } from '../../lens/build_lens_payload';
import type { DiscoverSessionPayload } from '../../discover_session/build_discover_session_payload';
import { buildDiscoverSessionPayload } from '../../discover_session/build_discover_session_payload';
import { useKibana, useToasts } from '../../../../common/lib/kibana';
import { useCreateAttachments } from '../../../../containers/use_create_attachments';
import { useRefreshCaseViewPage } from '../../../case_view/use_on_refresh_case_view_page';
import { SO_TYPE_TO_ATTACHMENT_TYPE, type SupportedSavedObjectType } from './helpers';
import type { FoundSavedObject } from './types';
import * as i18n from './translations';

export interface UseAttachSavedObjectArgs {
  caseId: string;
  caseOwner: string;
  onAttached: () => void;
}

export interface UseAttachSavedObjectResult {
  attach: (object: FoundSavedObject) => Promise<void>;
  attachmentId: string | null;
  /** True while any attach request from this hook (or its dependencies) is in flight. */
  isAttaching: boolean;
}

/**
 * Builds the right attachment payload for the SO type (dashboard/map snapshot
 * the SO content at attach time; reference-typed search just stores the id),
 * creates the attachment, and refreshes the case view.
 */
export const useAttachSavedObject = ({
  caseId,
  caseOwner,
  onAttached,
}: UseAttachSavedObjectArgs): UseAttachSavedObjectResult => {
  const {
    services: { contentManagement, dashboard, data: dataService },
  } = useKibana();
  const { timefilter } = dataService.query.timefilter;
  const toasts = useToasts();
  const refreshCaseViewPage = useRefreshCaseViewPage();
  const { mutateAsync: createAttachments, isLoading: isAttaching } = useCreateAttachments();
  const [attachmentId, setAttachmentId] = useState<string | null>(null);

  const attach = useCallback(
    async (object: FoundSavedObject) => {
      const supportedType = object.type as SupportedSavedObjectType;
      const attachmentType = SO_TYPE_TO_ATTACHMENT_TYPE[supportedType];
      if (!attachmentType) {
        return;
      }

      const title = object.meta.title ?? object.id;
      setAttachmentId(object.id);
      try {
        let attachment: DashboardPayload | MapPayload | DiscoverSessionPayload | LensPayload;
        if (supportedType === MAP_SO_TYPE) {
          attachment = await buildMapPayload({ contentManagement, id: object.id, title });
        } else if (supportedType === DASHBOARD_SO_TYPE) {
          attachment = await buildDashboardPayload({ dashboard, id: object.id, title });
        } else if (supportedType === LENS_SO_TYPE) {
          // Lens does not persist a view time range on the SO by design — the
          // surrounding context (here: the attach action) owns it. Mirrors the
          // "Add to existing case" embeddable action, which snapshots the live
          // `lensApi.timeRange$` at action time.
          const timeRange = timefilter.getTime();
          attachment = await buildLensPayload({
            contentManagement,
            id: object.id,
            timeRange,
            title,
          });
        } else {
          attachment = buildDiscoverSessionPayload({ id: object.id, title });
        }

        await createAttachments({
          caseId,
          caseOwner,
          attachments: [attachment],
        });
        toasts.addSuccess({
          title: i18n.ATTACH_SUCCESS_TITLE,
          text: title,
        });
        refreshCaseViewPage();
        onAttached();
      } finally {
        setAttachmentId(null);
      }
    },
    [
      caseId,
      caseOwner,
      contentManagement,
      createAttachments,
      dashboard,
      onAttached,
      refreshCaseViewPage,
      timefilter,
      toasts,
    ]
  );

  return { attach, attachmentId, isAttaching };
};
