import type { AuditLogger } from '@kbn/security-plugin/server';
import type { EventDetails } from './types';
export declare class UserActionAuditLogger {
    private readonly auditLogger;
    constructor(auditLogger: AuditLogger);
    log(event?: EventDetails, storedUserActionId?: string): void;
}
