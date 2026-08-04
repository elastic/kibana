import type { KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
export declare const getUpdatableSavedObjectTypes: ({ request, types, authorization, }: {
    types: string[];
    request: KibanaRequest;
    authorization?: SecurityPluginSetup["authz"];
}) => Promise<string[]>;
