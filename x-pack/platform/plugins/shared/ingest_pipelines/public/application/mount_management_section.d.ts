import type { CoreSetup } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import type { StartDependencies, ILicense, Config } from '../types';
export interface AppParams extends ManagementAppMountParams {
    license: ILicense | null;
    config: Config;
}
export declare function mountManagementSection({ http, getStartServices }: CoreSetup<StartDependencies>, params: AppParams): Promise<() => void>;
