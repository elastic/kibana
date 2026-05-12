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
  LensAttachmentPayloadSchema,
  isLensPersistableData,
  type LensPersistableAttachmentData,
  type LensSavedObjectAttachmentMetadata,
} from '../../../../common/types/domain_zod/attachment/lens/v2';
import * as i18n from './translations';

import {
  AttachmentActionType,
  defineAttachment,
  type UnifiedHybridAttachmentViewProps,
} from '../../../client/attachment_framework/types';
import type { LensProps } from './types';
import { OpenLensButton } from './open_lens_button';
import { LensRenderer } from './lens_renderer';
import { LensReferenceEvent } from './reference_event';
import { LensSavedObjectEmbed } from './lens_saved_object_embed';

type LensViewProps = UnifiedHybridAttachmentViewProps<
  LensPersistableAttachmentData,
  LensSavedObjectAttachmentMetadata
>;

const toLensPropsFromState = (data: LensPersistableAttachmentData): LensProps =>
  // `state` is `Record<string, unknown>` in the schema; the concrete shape
  // (`LensProps`) is owned by the lens plugin and asserted here.
  data.state as unknown as LensProps;

const PersistableEmbed = React.memo(
  ({ data }: { data: LensPersistableAttachmentData }) => {
    const { attributes, timeRange, metadata } = toLensPropsFromState(data);
    return <LensRenderer attributes={attributes} timeRange={timeRange} metadata={metadata} />;
  },
  (prev, next) => deepEqual(prev.data, next.data)
);
PersistableEmbed.displayName = 'PersistableLensEmbed';

/** Lens schema enforces `attachmentId: string`; framework type is broader (allows alert batches). */
const toLensId = (attachmentId: string | string[] | undefined): string | undefined =>
  Array.isArray(attachmentId) ? attachmentId[0] : attachmentId;

const LensEmbedAttachmentLazy = React.lazy(async () => {
  const Component: React.FC<LensViewProps> = ({ data, attachmentId, metadata }) => {
    if (data && isLensPersistableData(data)) {
      return <PersistableEmbed data={data} />;
    }
    const id = toLensId(attachmentId);
    if (id) {
      return (
        <LensSavedObjectEmbed
          attachmentId={id}
          title={metadata?.title}
          snapshot={metadata?.config as LensProps['attributes'] | undefined}
          timeRange={metadata?.timeRange}
        />
      );
    }
    return null;
  };
  Component.displayName = 'LensEmbedAttachment';
  return { default: Component };
});

const getPersistableActions = (savedObjectId: string, lensProps: LensProps) => [
  {
    type: AttachmentActionType.CUSTOM as const,
    render: () => (
      <OpenLensButton
        savedObjectId={savedObjectId}
        attributes={lensProps.attributes}
        timeRange={lensProps.timeRange}
        metadata={lensProps.metadata}
      />
    ),
    isPrimary: false,
  },
];

const getSavedObjectActions = (
  attachmentId: string,
  metadata?: LensSavedObjectAttachmentMetadata
) => {
  // Open-in-lens needs `attributes`. With Model C we have a snapshot under
  // `metadata.config` only when one was captured; defer the action otherwise.
  const snapshot = metadata?.config as LensProps['attributes'] | undefined;
  if (!snapshot) return [];
  return [
    {
      type: AttachmentActionType.CUSTOM as const,
      render: () => (
        <OpenLensButton
          savedObjectId={attachmentId}
          attributes={snapshot}
          timeRange={metadata?.timeRange}
        />
      ),
      isPrimary: false,
    },
  ];
};

const getLensAttachmentViewObject = (props: LensViewProps) => {
  const { savedObjectId, data, attachmentId, metadata } = props;

  // Persistable arm — value-typed payload with full state in `data.state`.
  if (data && isLensPersistableData(data)) {
    const lensProps = toLensPropsFromState(data);
    return {
      event: i18n.ADDED_LENS_VISUALIZATION,
      timelineAvatar: 'lensApp',
      getActions: () => getPersistableActions(savedObjectId, lensProps),
      hideDefaultActions: false,
      children: LensEmbedAttachmentLazy,
    };
  }

  // SO-ref arm — `LensSavedObjectEmbed` does live-fetch + snapshot fallback +
  // title-only fallback internally; the event row stays consistent.
  const id = toLensId(attachmentId);
  if (id) {
    return {
      event: i18n.ADDED_LENS_VISUALIZATION,
      timelineAvatar: 'lensApp',
      getActions: () => getSavedObjectActions(id, metadata),
      hideDefaultActions: false,
      children: LensEmbedAttachmentLazy,
    };
  }

  // Defensive fallback — schema validation should already prevent this.
  return {
    event: <LensReferenceEvent savedObjectId={savedObjectId} title={metadata?.title} />,
    timelineAvatar: 'lensApp',
    hideDefaultActions: false,
  };
};

export const getLensAttachmentType = () =>
  defineAttachment({
    id: LENS_ATTACHMENT_TYPE,
    icon: 'document',
    displayName: i18n.LENS_VISUALIZATIONS,
    getAttachmentViewObject: getLensAttachmentViewObject,
    getAttachmentRemovalObject: () => ({ event: i18n.REMOVED_LENS_VISUALIZATION }),
    schema: LensAttachmentPayloadSchema,
  });
