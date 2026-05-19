import type { AuditEvent } from '@kbn/security-plugin/server';
declare class AuditLoggingService {
    /**
     * Write a custom audit log record. If a current request is available, the log will include
     * user/session data. If not, an unscoped audit logger will be used.
     *
     * Note: all Fleet audit logs written via this method will have a `labels.application` value
     * of `elastic/fleet`. Consumers aren't able to override this value, and a custom `labels.application`
     * value provided as an argument will be overwritten.
     */
    writeCustomAuditLog(args: AuditEvent): void;
    /**
     * Helper method for writing saved object related audit logs. Since Fleet
     * uses an internal SO client to support its custom RBAC model around Fleet/Integrations
     * permissions, we need to implement our own audit logging for saved objects that use the
     * internal client. This helper reduces the boilerplate around audit logging in those cases.
     *
     * @example
     * ```ts
     * auditLoggingService.writeCustomSoAuditLog({
     *   action: 'find',
     *   id: 'some-id-123',
     *   savedObjectType: PACKAGE_POLICY_SAVED_OBJECT_TYPE
     * });
     * ```
     */
    writeCustomSoAuditLog({ action, id, name, savedObjectType, }: {
        action: 'find' | 'get' | 'create' | 'update' | 'delete';
        id: string;
        name?: string;
        savedObjectType: string;
    }): void;
}
export declare const auditLoggingService: AuditLoggingService;
export {};
