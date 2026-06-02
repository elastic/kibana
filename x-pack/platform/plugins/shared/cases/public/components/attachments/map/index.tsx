/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MAP_ATTACHMENT_TYPE } from '../../../../common/constants';
import {
  MapAttachmentPayloadSchema,
  type MapAttachmentData,
  type MapAttachmentMetadata,
} from '../../../../common/types/domain_zod/attachment/map/v2';
import {
  defineAttachment,
  type UnifiedReferenceAttachmentViewProps,
} from '../../../client/attachment_framework/types';
import * as i18n from './translations';
import { SavedObjectAddedEvent } from '../common/saved_object/saved_object_added_event';
import { createSavedObjectAttachmentsTab } from '../common/saved_object/saved_object_attachments_tab';

type MapViewProps = UnifiedReferenceAttachmentViewProps<MapAttachmentMetadata, MapAttachmentData>;

const MAP_SO_TYPE = 'map';

const MapEmbedAttachmentLazy = React.lazy(async () => {
  const { MapEmbedAttachment } = await import('./map_embed_attachment');
  return { default: MapEmbedAttachment };
});

const MapAttachmentsTab = createSavedObjectAttachmentsTab({
  attachmentTypeId: MAP_ATTACHMENT_TYPE,
  soType: MAP_SO_TYPE,
});

const getMapAttachmentViewObject = ({ attachmentId, metadata, data }: MapViewProps) => {
  // Schema constrains `attachmentId` to a single string; the framework type
  // permits `string | string[]` for reference attachments that bulk-attach
  // (alerts), hence the cast.
  const id = attachmentId as string;
  // Always show "added map <title>" as the timeline event. Inline embed is
  // appended as `children` only when a snapshot was captured at attach time.
  const event = (
    <SavedObjectAddedEvent
      soType={MAP_SO_TYPE}
      attachmentId={id}
      title={metadata?.title}
      label={i18n.ADDED_MAP}
      data-test-subj="cases-map-event-link"
    />
  );

  return {
    event,
    timelineAvatar: 'gisApp' as const,
    hideDefaultActions: false,
    ...(data ? { children: MapEmbedAttachmentLazy } : {}),
  };
};

export const getMapAttachmentType = () =>
  defineAttachment({
    id: MAP_ATTACHMENT_TYPE,
    icon: 'gisApp',
    displayName: i18n.MAPS,
    getAttachmentViewObject: getMapAttachmentViewObject,
    getAttachmentRemovalObject: () => ({ event: i18n.REMOVED_MAP }),
    getAttachmentTabViewObject: () => ({ children: MapAttachmentsTab }),
    schema: MapAttachmentPayloadSchema,
  });
