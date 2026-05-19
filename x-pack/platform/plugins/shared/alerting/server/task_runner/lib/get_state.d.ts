import type { Logger } from '@kbn/core/server';
import type { RuleRunnerErrorStackTraceLog, RunRuleResult } from '../types';
import type { RuleTaskState } from '../../types';
import type { Result } from '../../lib/result_type';
export declare function getState({ runRuleResult, startedAt, ruleId, spaceId, ruleTypeId, logger, stackTraceLog, originalState, }: {
    runRuleResult: Result<RunRuleResult, Error>;
    startedAt: Date | null;
    ruleId: string;
    spaceId: string;
    ruleTypeId: string;
    logger: Logger;
    stackTraceLog: RuleRunnerErrorStackTraceLog | null;
    originalState: RuleTaskState;
}): Readonly<{
    alertTypeState?: Record<string, any> | undefined;
    alertInstances?: Record<string, Readonly<{
        state?: Record<string, any> | undefined;
        meta?: Readonly<{
            uuid?: string | undefined;
            flappingHistory?: boolean[] | undefined;
            flapping?: boolean | undefined;
            pendingRecoveredCount?: number | undefined;
            activeCount?: number | undefined;
            lastScheduledActions?: Readonly<{
                actions?: Record<string, Readonly<{} & {
                    date: string;
                }>> | undefined;
                subgroup?: string | undefined;
            } & {
                group: string;
                date: string;
            }> | undefined;
            maintenanceWindowIds?: string[] | undefined;
            maintenanceWindowNames?: string[] | undefined;
        } & {}> | undefined;
    } & {}>> | undefined;
    alertRecoveredInstances?: Record<string, Readonly<{
        state?: Record<string, any> | undefined;
        meta?: Readonly<{
            uuid?: string | undefined;
            flappingHistory?: boolean[] | undefined;
            flapping?: boolean | undefined;
            pendingRecoveredCount?: number | undefined;
            activeCount?: number | undefined;
            lastScheduledActions?: Readonly<{
                actions?: Record<string, Readonly<{} & {
                    date: string;
                }>> | undefined;
                subgroup?: string | undefined;
            } & {
                group: string;
                date: string;
            }> | undefined;
            maintenanceWindowIds?: string[] | undefined;
            maintenanceWindowNames?: string[] | undefined;
        } & {}> | undefined;
    } & {}>> | undefined;
    previousStartedAt?: string | null | undefined;
    summaryActions?: Record<string, Readonly<{} & {
        date: string;
    }>> | undefined;
} & {}>;
