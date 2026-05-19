import type { EcsEvent } from '@kbn/core/server';
import type { OperationDetails } from './types';
import { ReadOperations, WriteOperations } from './types';
export * from './authorization';
export * from './audit_logger';
export * from './types';
/**
 * Database constant for ECS category for use for audit logging.
 */
export declare const DATABASE_CATEGORY: EcsEvent['category'];
/**
 * ECS Outcomes for audit logging.
 */
export declare const ECS_OUTCOMES: Record<string, EcsEvent['outcome']>;
/**
 * Determines if the passed in operation was a write operation.
 *
 * @param operation an OperationDetails object describing the operation that occurred
 * @returns true if the passed in operation was a write operation
 */
export declare function isWriteOperation(operation: OperationDetails): boolean;
/**
 * Definition of all APIs within the cases backend.
 */
export declare const Operations: Record<ReadOperations | WriteOperations, OperationDetails>;
