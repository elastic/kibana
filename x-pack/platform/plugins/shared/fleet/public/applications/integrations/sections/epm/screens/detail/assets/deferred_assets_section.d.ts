import type { FunctionComponent } from 'react';
import type { AssetReference } from '../../../../../../../../common';
import type { PackageInfo } from '../../../../../types';
interface Props {
    packageInfo: PackageInfo;
    deferredInstallations: AssetReference[];
    forceRefreshAssets?: () => void;
}
export declare const DeferredAssetsSection: FunctionComponent<Props>;
export {};
