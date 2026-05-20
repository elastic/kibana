import type { CoreStart } from '@kbn/core/public';
import type { CasesUiConfigType } from '../../../../common/ui/types';
import type { CasesPublicStartDependencies } from '../../../types';
type GlobalServices = Pick<CoreStart, 'application' | 'http' | 'theme' | 'uiSettings' | 'userProfile'> & Pick<CasesPublicStartDependencies, 'serverless'>;
export declare class KibanaServices {
    private static kibanaVersion?;
    private static services?;
    private static config?;
    static init({ application, config, http, serverless, kibanaVersion, ...startServices }: GlobalServices & {
        kibanaVersion: string;
        config: CasesUiConfigType;
    }): void;
    static get(): GlobalServices;
    static getKibanaVersion(): string;
    static getConfig(): CasesUiConfigType | undefined;
    private static throwUninitializedError;
}
export {};
