import type { HttpStart } from '@kbn/core/public';
import type { AuthorizationServiceSetup } from '@kbn/security-plugin-types-public';
import type { ConfigType } from '../config';
interface SetupParams {
    config: ConfigType;
    http: HttpStart;
}
export declare class AuthorizationService {
    setup({ config, http }: SetupParams): AuthorizationServiceSetup;
}
export {};
