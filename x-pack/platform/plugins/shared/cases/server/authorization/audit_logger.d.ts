import type { AuditLogger } from '@kbn/security-plugin/server';
import type { OperationDetails } from '.';
import type { OwnerEntity } from './types';
interface CreateAuditMsgParams {
    operation: OperationDetails;
    entity?: OwnerEntity;
    error?: Error;
}
/**
 * Audit logger for authorization operations
 */
export declare class AuthorizationAuditLogger {
    private readonly auditLogger;
    constructor(logger: AuditLogger);
    /**
     * Creates an AuditEvent describing the state of a request.
     */
    private static createAuditMsg;
    /**
     * Creates a message to be passed to an Error or Boom.
     */
    static createFailureMessage({ owners, operation, }: {
        owners: string[];
        operation: OperationDetails | OperationDetails[];
    }): string;
    /**
     * Logs an audit event based on the status of an operation.
     */
    log(auditMsgParams: CreateAuditMsgParams): void;
}
export {};
