import type { PublicMethodsOf } from '@kbn/utility-types';
import type { SavedObjectsClientContract, ISavedObjectTypeRegistry, KibanaRequest } from '@kbn/core/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import type { AssignableObject, UpdateTagAssignmentsOptions, FindAssignableObjectsOptions } from '../../../common/assignments';
interface AssignmentServiceOptions {
    request?: KibanaRequest;
    client: SavedObjectsClientContract;
    typeRegistry: ISavedObjectTypeRegistry;
    authorization?: SecurityPluginSetup['authz'];
    internal?: boolean;
}
export type IAssignmentService = PublicMethodsOf<AssignmentService>;
export declare class AssignmentService {
    private readonly soClient;
    private readonly typeRegistry;
    private readonly authorization?;
    private readonly request?;
    private readonly internal;
    constructor({ client, typeRegistry, authorization, request, internal, }: AssignmentServiceOptions);
    findAssignableObjects({ search, types, maxResults, }: FindAssignableObjectsOptions): Promise<AssignableObject[]>;
    getAssignableTypes(types?: string[]): Promise<string[]>;
    updateTagAssignments({ tags, assign, unassign, refresh, }: UpdateTagAssignmentsOptions): Promise<void>;
}
export {};
