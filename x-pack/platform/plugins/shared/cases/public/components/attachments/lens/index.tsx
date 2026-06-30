/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import deepEqual from 'fast-deep-equal';
import { LENS_ATTACHMENT_TYPE } from '../../../../common/constants';
import {
  isLensPersistableData,
  LensAttachmentPayloadSchema,
  type LensPersistableAttachmentData,
  type LensSavedObjectAttachmentData,
  type LensSavedObjectAttachmentMetadata,
  type LensAttachmentData,
} from '../../../../common/types/domain_zod/attachment/lens/v2';
import { LENS_SO_TYPE } from '../../../../common/constants/attachments';
import * as i18n from './translations';

import {
  AttachmentActionType,
  defineAttachment,
  type UnifiedHybridAttachmentViewProps,
} from '../../../client/attachment_framework/types';
import type { LensProps } from './types';
import { OpenLensButton } from './open_lens_button';
import { LensRenderer } from './lens_renderer';
import { SavedObjectAddedEvent } from '../common/saved_object/saved_object_added_event';
import { createSavedObjectAttachmentsTab } from '../common/saved_object/saved_object_attachments_tab';

type LensViewProps = UnifiedHybridAttachmentViewProps<
  LensPersistableAttachmentData | LensSavedObjectAttachmentData,
  LensSavedObjectAttachmentMetadata,
  string
>;

function getOpenLensButton(savedObjectId: string, props: LensProps) {
  return (
    <OpenLensButton
      savedObjectId={savedObjectId}
      attributes={props.attributes}
      timeRange={props.timeRange}
      metadata={props.metadata}
    />
  );
}

const getVisualizationAttachmentActions = (savedObjectId: string, props: LensProps) => [
  {
    type: AttachmentActionType.CUSTOM as const,
    render: () => getOpenLensButton(savedObjectId, props),
    isPrimary: false,
  },
];

const toLensProps = (data: LensAttachmentData) => {
  if (isLensPersistableData(data)) {
    return data.state as LensProps;
  }
  return { attributes: data.attributes, timeRange: data.timeRange } as unknown as LensProps;
};

const LensAttachment = React.memo(
  ({ data }: LensViewProps) => {
    if (!data) {
      return null;
    }
    const { attributes, timeRange, metadata } = toLensProps(data);
    return <LensRenderer attributes={attributes} timeRange={timeRange} metadata={metadata} />;
  },
  (prevProps, nextProps) => deepEqual(prevProps.data, nextProps.data)
);

LensAttachment.displayName = 'LensAttachment';

const LensAttachmentRendererLazyComponent = React.lazy(async () => ({
  default: LensAttachment,
}));

const LensAttachmentsTab = createSavedObjectAttachmentsTab({
  attachmentTypeId: LENS_ATTACHMENT_TYPE,
  soType: LENS_SO_TYPE,
});

const getVisualizationAttachmentViewObject = ({
  savedObjectId,
  data,
  attachmentId,
  metadata,
}: LensViewProps) => {
  const openLensId = attachmentId ?? savedObjectId;
  const event =
    attachmentId != null ? (
      <SavedObjectAddedEvent
        soType={LENS_SO_TYPE}
        attachmentId={attachmentId}
        title={metadata?.title}
        label={i18n.ADDED_VISUALIZATION}
        data-test-subj="cases-lens-event-link"
      />
    ) : (
      i18n.ADDED_VISUALIZATION
    );
  const lensProps = data ? toLensProps(data) : undefined;
  return {
    event,
    timelineAvatar: 'lensApp',
    ...(lensProps
      ? { getActions: () => getVisualizationAttachmentActions(openLensId, lensProps) }
      : {}),
    hideDefaultActions: false,
    ...(data ? { children: LensAttachmentRendererLazyComponent } : {}),
  };
};

export const getVisualizationAttachmentType = () =>
  defineAttachment({
    id: LENS_ATTACHMENT_TYPE,
    icon: 'document',
    displayName: i18n.VISUALIZATIONS,
    getAttachmentViewObject: getVisualizationAttachmentViewObject,
    getAttachmentRemovalObject: () => ({ event: i18n.REMOVED_VISUALIZATION }),
    getAttachmentTabViewObject: () => ({ children: LensAttachmentsTab }),
    schema: LensAttachmentPayloadSchema,
  });
