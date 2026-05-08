/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import {
  DiscoverSessionAttachmentPayloadSchema,
  type SavedObjectReferenceMetadata,
} from '../../../../common/types/domain_zod/attachment/saved_object/v2';
import { DISCOVER_SESSION_ATTACHMENT_TYPE } from '../../../../common/constants/attachments';
import {
  defineAttachment,
  type UnifiedReferenceAttachmentViewProps,
} from '../../../client/attachment_framework/types';
import { useKibana } from '../../../common/lib/kibana';
import * as i18n from './translations';

/**
 * Response shape for `/api/kibana/management/saved_objects/_bulk_get`. The
 * saved_objects_management plugin owns `meta.inAppUrl.path` per SO type.
 */
interface BulkGetMetaResponseItem {
  id: string;
  type: string;
  meta?: { inAppUrl?: { path?: string; uiCapabilitiesPath?: string } };
}

const SavedObjectAttachmentView: React.FC<
  UnifiedReferenceAttachmentViewProps<SavedObjectReferenceMetadata>
> = ({ attachmentId, metadata }) => {
  const {
    services: { http },
  } = useKibana();
  const id = Array.isArray(attachmentId) ? attachmentId[0] : attachmentId;
  const title = metadata?.title ?? '';
  const soType = metadata?.soType;
  const [href, setHref] = useState<string | undefined>();

  useEffect(() => {
    if (!soType) return;
    let cancelled = false;
    (async () => {
      try {
        const resp = await http.post<BulkGetMetaResponseItem[]>(
          '/api/kibana/management/saved_objects/_bulk_get',
          { body: JSON.stringify([{ type: soType, id }]) }
        );
        const path = resp?.[0]?.meta?.inAppUrl?.path;
        if (!cancelled && path) {
          setHref(http.basePath.prepend(path));
        }
      } catch {
        // Leave href undefined; renders as plain text.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [http, soType, id]);

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={false}>
      <EuiFlexItem grow={false}>
        <EuiText size="s">
          {href ? (
            <EuiLink href={href} data-test-subj={`cases-so-attachment-link-${id}`}>
              {title || id}
            </EuiLink>
          ) : (
            title || id
          )}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

SavedObjectAttachmentView.displayName = 'SavedObjectAttachmentView';

/**
 * Reference-typed SO attachment registrations live here. Value-typed SO
 * attachments (lens, dashboard, map) own their own folders/renderers because
 * they need bespoke embedding logic.
 */
export const getDiscoverSessionAttachmentType = () =>
  defineAttachment({
    id: DISCOVER_SESSION_ATTACHMENT_TYPE,
    icon: 'discoverApp',
    displayName: i18n.DISCOVER_SESSION,
    schema: DiscoverSessionAttachmentPayloadSchema,
    getAttachmentViewObject: (props) => ({
      event: <SavedObjectAttachmentView {...props} />,
      timelineAvatar: 'discoverApp',
      hideDefaultActions: false,
    }),
    getAttachmentRemovalObject: () => ({ event: i18n.REMOVED_DISCOVER_SESSION }),
  });
