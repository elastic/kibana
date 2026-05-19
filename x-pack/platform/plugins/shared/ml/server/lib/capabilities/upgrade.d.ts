import type { MlClient } from '../ml_client';
export declare function upgradeCheckProvider(mlClient: MlClient): {
    isUpgradeInProgress: () => Promise<boolean>;
};
