import React from 'react';
import type { MapAttributes } from '@kbn/maps-plugin/server';
import type { MapAttachmentData, MapAttachmentMetadata, MapAttributesSnapshot } from '../../../../common/types/domain_zod/attachment/map/v2';
import type { UnifiedReferenceAttachmentViewProps } from '../../../client/attachment_framework/types';
type MapViewProps = UnifiedReferenceAttachmentViewProps<MapAttachmentMetadata, string, MapAttachmentData>;
/**
 * Compile-time tripwire: if Maps drops or renames any of the snapshot fields
 * (or changes one to a type that isn't assignable to ours), this `Pick` fails
 * typecheck and forces us to sync `MapAttributesSnapshotSchema`. The snapshot
 * types are intentionally loose (e.g. `layers: unknown[]`) so renderer-side
 * shape evolution within an existing field is allowed.
 *
 * The key union is pinned by hand instead of `keyof MapAttributesSnapshot`
 * because the schema is `.loose()` — Zod adds an `[k: string]: unknown` index
 * signature to the inferred type which would collapse `keyof` to `string`.
 */
type MapSnapshotKey = 'title' | 'layers' | 'center' | 'zoom' | 'settings' | 'isLayerTOCOpen';
export type MapSnapshotMatchesMapAttributes = (attrs: Pick<MapAttributes, MapSnapshotKey>) => Pick<MapAttributesSnapshot, MapSnapshotKey>;
export declare const MapEmbedAttachment: React.NamedExoticComponent<MapViewProps>;
export {};
