import type { KibanaRequest } from '@kbn/core/server';
import type { FunctionRegistrationParameters } from '.';
export declare function registerKibanaFunction({ functions, resources, }: FunctionRegistrationParameters & {
    resources: {
        request: KibanaRequest;
    };
}): void;
