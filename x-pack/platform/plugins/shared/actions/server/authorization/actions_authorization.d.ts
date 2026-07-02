import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
export interface ConstructorOptions {
    request: KibanaRequest;
    authorization?: SecurityPluginSetup['authz'];
}
export declare class ActionsAuthorization {
    private readonly request;
    private readonly authorization?;
    constructor({ request, authorization }: ConstructorOptions);
    ensureAuthorized({ operation, actionTypeId, additionalPrivileges, }: {
        operation: string;
        actionTypeId?: string;
        additionalPrivileges?: string[];
    }): Promise<void>;
}
