import { type HttpSetup } from '@kbn/core-http-browser';
import type { CreateOAuthClientPayload, CreateOAuthClientResponse, GetOAuthClientResponse, ListOAuthClientsResponse, RevokeOAuthClientPayload, RevokeOAuthClientResponse } from '../../../common/http_api/oauth_clients';
export declare class OAuthClientsService {
    private readonly http;
    constructor({ http }: {
        http: HttpSetup;
    });
    list(): Promise<ListOAuthClientsResponse>;
    get(clientId: string): Promise<GetOAuthClientResponse>;
    create(payload: CreateOAuthClientPayload): Promise<CreateOAuthClientResponse>;
    revoke(clientId: string, payload?: RevokeOAuthClientPayload): Promise<RevokeOAuthClientResponse>;
}
