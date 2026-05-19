import type { AxiosInstance } from 'axios';
import { type GetTokenOpts } from '@kbn/connector-specs';
import type { AxiosAuthStrategy, AuthStrategyDeps } from './types';
export declare class EarsStrategy implements AxiosAuthStrategy {
    installResponseInterceptor(axiosInstance: AxiosInstance, deps: AuthStrategyDeps): void;
    getToken(opts: GetTokenOpts, deps: AuthStrategyDeps): Promise<string | null>;
}
