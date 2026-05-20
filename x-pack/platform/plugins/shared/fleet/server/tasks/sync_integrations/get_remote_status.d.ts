import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { GetRemoteSyncedIntegrationsStatusResponse } from '../../../common/types';
export declare const getRemoteSyncedIntegrationsInfoByOutputId: (soClient: SavedObjectsClientContract, outputId: string) => Promise<GetRemoteSyncedIntegrationsStatusResponse>;
