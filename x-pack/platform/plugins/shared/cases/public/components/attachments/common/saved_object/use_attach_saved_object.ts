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
    services: { contentManagement, dashboard },
  } = useKibana();
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
      if (supportedType === LENS_SO_TYPE) {
        // Lens attach is owned by `useOpenLensForAttach`
        return;
      }

      const title = object.meta.title ?? object.id;
      setAttachmentId(object.id);
      try {
        let attachment: DashboardPayload | MapPayload | DiscoverSessionPayload;
        if (supportedType === MAP_SO_TYPE) {
          attachment = await buildMapPayload({ contentManagement, id: object.id, title });
        } else if (supportedType === DASHBOARD_SO_TYPE) {
          attachment = await buildDashboardPayload({ dashboard, id: object.id, title });
        } else {
          // Lens routes through `useOpenLensForAttach` -> Lens editor -> return
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
      toasts,
    ]
  );

  return { attach, attachmentId, isAttaching };
};
