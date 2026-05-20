import type { EcsEvent, KibanaRequest } from '@kbn/core/server';
import type { AuditEvent } from '@kbn/security-plugin-types-server';
import type { AuthenticationProvider } from '../../common';
import type { AuthenticationResult } from '../authentication/authentication_result';
import type { AddAuditEventParams as SavedObjectEventParams } from '../saved_objects/saved_objects_security_extension';
export interface HttpRequestParams {
    request: KibanaRequest;
}
export declare function httpRequestEvent({ request }: HttpRequestParams): AuditEvent;
export interface UserLoginParams {
    authenticationResult: AuthenticationResult;
    authenticationProvider?: string;
    authenticationType?: string;
    sessionId?: string;
    userProfileId?: string;
}
export declare function userLoginEvent({ authenticationResult, authenticationProvider, authenticationType, sessionId, userProfileId, }: UserLoginParams): AuditEvent;
export interface UserLogoutParams {
    username?: string;
    provider: AuthenticationProvider;
    userProfileId?: string;
}
export declare function userLogoutEvent({ username, provider, userProfileId, }: UserLogoutParams): AuditEvent;
export declare function userSessionConcurrentLimitLogoutEvent({ username, provider, userProfileId, }: UserLogoutParams): AuditEvent;
export interface SessionCleanupParams {
    sessionId: string;
    usernameHash?: string;
    provider: AuthenticationProvider;
}
export declare function sessionCleanupEvent({ usernameHash, sessionId, provider, }: SessionCleanupParams): AuditEvent;
export declare function sessionCleanupConcurrentLimitEvent({ usernameHash, sessionId, provider, }: SessionCleanupParams): AuditEvent;
export interface AccessAgreementAcknowledgedParams {
    username: string;
    provider: AuthenticationProvider;
}
export declare function accessAgreementAcknowledgedEvent({ username, provider, }: AccessAgreementAcknowledgedParams): AuditEvent;
export declare function savedObjectEvent({ action, savedObject, addToSpaces, deleteFromSpaces, unauthorizedSpaces, unauthorizedTypes, outcome, error, }: SavedObjectEventParams): AuditEvent | undefined;
export declare enum SpaceAuditAction {
    CREATE = "space_create",
    GET = "space_get",
    UPDATE = "space_update",
    DELETE = "space_delete",
    FIND = "space_find"
}
export interface SpacesAuditEventParams {
    action: SpaceAuditAction;
    outcome?: EcsEvent['outcome'];
    savedObject?: NonNullable<AuditEvent['kibana']>['saved_object'];
    error?: Error;
}
export declare function spaceAuditEvent({ action, savedObject, outcome, error, }: SpacesAuditEventParams): AuditEvent;
