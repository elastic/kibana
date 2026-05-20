import type { HttpSetup } from '@kbn/core-http-browser';
import type { ListOAuthClientsResponse } from '../../../common/http_api/oauth_clients';
export declare class OAuthClientsService {
    private readonly http;
    constructor({ http }: {
        http: HttpSetup;
    });
    list(): Promise<ListOAuthClientsResponse>;
}
