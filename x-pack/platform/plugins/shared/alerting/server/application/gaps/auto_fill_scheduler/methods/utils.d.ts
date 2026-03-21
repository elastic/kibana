import type { RulesClientContext } from '../../../../rules_client/types';
import type { GapAutoFillSchedulerSO } from '../../../../data/gap_auto_fill_scheduler/types/gap_auto_fill_scheduler';
import type { ReadOperations, WriteOperations } from '../../../../authorization';
import { GapAutoFillSchedulerAuditAction } from '../../../../rules_client/common/audit_events';
/**
 * Fetches the gap auto fill scheduler saved object and performs rule type based authorization.
 */
export declare const getGapAutoFillSchedulerSO: ({ context, id, operation, authAuditAction, }: {
    context: RulesClientContext;
    id: string;
    operation: ReadOperations | WriteOperations;
    authAuditAction: GapAutoFillSchedulerAuditAction;
}) => Promise<import("@kbn/core/server").SavedObject<GapAutoFillSchedulerSO>>;
