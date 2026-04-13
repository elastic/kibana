import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { StreamsAppStartDependencies } from '../types';
import type { StreamsAppServices } from '../services/types';
export interface StreamsAppKibanaContext {
    appParams: AppMountParameters;
    core: CoreStart;
    dependencies: {
        start: StreamsAppStartDependencies;
    };
    services: StreamsAppServices;
    isServerless: boolean;
}
declare const useTypedKibana: () => StreamsAppKibanaContext;
export { useTypedKibana as useKibana };
