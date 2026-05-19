import type { ISavedObjectTypeRegistry } from '@kbn/core/server';
import type { AuthorizeObject, CheckAuthorizationResult, GetObjectsRequiringPrivilegeCheckResult, ObjectRequiringPrivilegeCheckResult } from '@kbn/core-saved-objects-server/src/extensions/security';
import type { AuthenticatedUser } from '@kbn/security-plugin-types-common';
import { SecurityAction } from '.';
export declare const MANAGE_ACCESS_CONTROL_ACTION = "manage_access_control";
interface AccessControlServiceParams {
    typeRegistry: ISavedObjectTypeRegistry;
}
export declare class AccessControlService {
    private userForOperation;
    private typeRegistry;
    constructor({ typeRegistry }: AccessControlServiceParams);
    setUserForOperation(user: AuthenticatedUser | null): void;
    shouldObjectRequireAccessControl(params: {
        object: AuthorizeObject;
        currentUser: AuthenticatedUser | null;
        actions: Set<SecurityAction>;
    }): boolean;
    getObjectsRequiringPrivilegeCheck({ objects, actions, }: {
        objects: AuthorizeObject[];
        actions: Set<SecurityAction>;
    }): GetObjectsRequiringPrivilegeCheckResult;
    enforceAccessControl<A extends string>({ authorizationResult, objectsRequiringPrivilegeCheck, currentSpace, addAuditEventFn, }: {
        authorizationResult: CheckAuthorizationResult<A>;
        objectsRequiringPrivilegeCheck: ObjectRequiringPrivilegeCheckResult[];
        currentSpace: string;
        addAuditEventFn?: (errMessage: string, types: string[]) => void;
    }): void;
}
export {};
