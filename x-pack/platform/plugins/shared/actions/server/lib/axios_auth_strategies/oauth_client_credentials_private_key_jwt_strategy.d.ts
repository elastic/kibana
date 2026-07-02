import type { AxiosInstance } from 'axios';
import type { GetTokenOpts } from '@kbn/connector-specs';
import type { AuthStrategyDeps, AxiosAuthStrategy } from './types';
export declare class OAuthClientCredentialsPrivateKeyJwtStrategy implements AxiosAuthStrategy {
    installResponseInterceptor(axiosInstance: AxiosInstance, deps: AuthStrategyDeps): void;
    getToken(opts: GetTokenOpts, deps: AuthStrategyDeps): Promise<string | null>;
}
