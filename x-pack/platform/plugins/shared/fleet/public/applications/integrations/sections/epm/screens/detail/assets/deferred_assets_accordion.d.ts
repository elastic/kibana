import type { FunctionComponent } from 'react';
import type { AssetReference } from '../../../../../../../../common';
import type { PackageInfo } from '../../../../../types';
import { ElasticsearchAssetType } from '../../../../../types';
import { KibanaSavedObjectType } from '../../../../../../../../common/types/models';
interface Props {
    packageInfo: PackageInfo;
    type: ElasticsearchAssetType.transform | KibanaSavedObjectType.alert;
    deferredInstallations: AssetReference[];
    forceRefreshAssets?: () => void;
}
export declare const getDeferredAssetDescription: (assetType: string, assetCount: number, permissions: {
    canEdit: boolean;
}) => string;
export declare const DeferredAssetsAccordion: FunctionComponent<Props>;
export {};
