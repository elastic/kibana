import type { SavedObjectClientForFind } from '../../../data/connector/types/params';
import type { GetUserTokenConnectorsSoResult } from '../../../data/connector/types';
export declare function getUserTokenConnectorsForProfile({ savedObjectsClient, profileUid, }: {
    savedObjectsClient: SavedObjectClientForFind;
    profileUid: string | undefined;
}): Promise<GetUserTokenConnectorsSoResult>;
