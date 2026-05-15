import React from 'react';
import type { IconType } from '@elastic/eui';
/**
 * Approximate vertical extent of the quality `EuiBadge` below the icon tile layout box
 * (`inset-block-end` overlay). Used when spacing the stats row so ~12px reads from the badge
 * to the data-type line.
 */
export declare const FLOW_CARD_QUALITY_BADGE_OVERFLOW_BELOW_ICON_TILE_PX = 8;
export interface IngestHubDemoStreamsFlowCardIconTileProps {
    readonly iconType: IconType;
    /** When set, the good / degraded / poor icon-only badge is overlapped at the tile bottom-right. */
    readonly qualityStatus?: 'good' | 'degraded' | 'poor';
}
export declare function IngestHubDemoStreamsFlowCardIconTile({ iconType, qualityStatus, }: IngestHubDemoStreamsFlowCardIconTileProps): React.JSX.Element;
