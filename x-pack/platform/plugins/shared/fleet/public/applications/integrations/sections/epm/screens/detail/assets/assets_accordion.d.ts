import type { FunctionComponent } from 'react';
import type { DisplayedAssetTypes, GetBulkAssetsResponse } from '../../../../../../../../common';
export type DisplayedAssetType = DisplayedAssetTypes[number] | 'view';
export declare const AssetsAccordion: FunctionComponent<{
    type: DisplayedAssetType;
    savedObjects: GetBulkAssetsResponse['items'];
}>;
