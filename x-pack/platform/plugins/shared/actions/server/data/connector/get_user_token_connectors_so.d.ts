import type { SavedObjectClientForFind } from './types/params';
interface GetUserTokenConnectorsSoParams {
    savedObjectsClient: SavedObjectClientForFind;
    profileUid: string;
}
export interface GetUserTokenConnectorsSoResult {
    connectorIds: string[];
}
export declare const getUserTokenConnectorsSo: ({ savedObjectsClient, profileUid, }: GetUserTokenConnectorsSoParams) => Promise<GetUserTokenConnectorsSoResult>;
export {};
