/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import deepEqual from 'fast-deep-equal';
import { css } from '@emotion/react';
import type { LayerDescriptor } from '@kbn/maps-plugin/common';
import { MAP_ATTACHMENT_TYPE } from '../../../../common/constants';
import {
  MapAttachmentPayloadSchema,
  hasMapAttributes,
  type MapAttachmentData,
} from '../../../../common/types/domain_zod/attachment/map/v2';
import {
  defineAttachment,
  type UnifiedValueAttachmentViewProps,
} from '../../../client/attachment_framework/types';
import { useKibana } from '../../../common/lib/kibana';
import * as i18n from './translations';
import { MapReferenceEvent } from './reference_event';

type MapViewProps = UnifiedValueAttachmentViewProps<MapAttachmentData>;

/**
 * Structural subset of `MapAttributes` (the CM/REST format the maps content
 * client returns — parsed `layers`/`center`/`settings`). Declared inline so
 * we don't pull `@kbn/maps-plugin/server` into the public bundle.
 */
interface MapAttributesSnapshot {
  title?: string;
  layers?: LayerDescriptor[];
  center?: { lat: number; lon: number };
  zoom?: number;
  settings?: Record<string, unknown>;
  isLayerTOCOpen?: boolean;
}

const mapContainerStyle = css`
  position: relative;
  width: 100%;
  height: 400px;
`;

const MapEmbedAttachment = React.memo(
  ({ data }: MapViewProps) => {
    const {
      services: { maps },
    } = useKibana();

    if (!hasMapAttributes(data)) return null;
    const attributes = data.attributes as MapAttributesSnapshot;
    const layerList = attributes.layers ?? [];
    const mapCenter =
      attributes.center && typeof attributes.zoom === 'number'
        ? { ...attributes.center, zoom: attributes.zoom }
        : undefined;

    return (
      <div css={mapContainerStyle} data-test-subj="cases-map-embed">
        <maps.Map
          layerList={layerList}
          mapCenter={mapCenter}
          mapSettings={attributes.settings}
          isLayerTOCOpen={attributes.isLayerTOCOpen}
          title={attributes.title}
          timeRange={data.timeRange}
          hideFilterActions
        />
      </div>
    );
  },
  (prev, next) => deepEqual(prev.data, next.data)
);

MapEmbedAttachment.displayName = 'MapEmbedAttachment';

const MapEmbedAttachmentLazy = React.lazy(async () => ({
  default: MapEmbedAttachment,
}));

const getMapAttachmentViewObject = ({ data }: MapViewProps) => {
  // Snapshot present ⇒ render the map inline. Absent ⇒ title-only event
  // (in-app link is resolved by the reference component itself).
  if (!hasMapAttributes(data)) {
    return {
      event: <MapReferenceEvent savedObjectId={data.savedObjectId} title={data.title} />,
      timelineAvatar: 'gisApp',
      hideDefaultActions: false,
    };
  }
  return {
    event: i18n.ADDED_MAP,
    timelineAvatar: 'gisApp',
    hideDefaultActions: false,
    children: MapEmbedAttachmentLazy,
  };
};

export const getMapAttachmentType = () =>
  defineAttachment({
    id: MAP_ATTACHMENT_TYPE,
    icon: 'gisApp',
    displayName: i18n.MAPS,
    getAttachmentViewObject: getMapAttachmentViewObject,
    getAttachmentRemovalObject: () => ({ event: i18n.REMOVED_MAP }),
    schema: MapAttachmentPayloadSchema,
  });
