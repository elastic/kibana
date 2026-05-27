import { z } from '@kbn/zod';
declare const postCompositeSloSummaryRefreshParamsSchema: z.ZodObject<{}, z.core.$strip>;
export type CompositeSloSummaryRefreshSkippedReason = 'task_disabled' | 'cooldown' | 'task_not_scheduled' | 'already_running' | 'run_soon_failed';
export type PostCompositeSloSummaryRefreshResponse = {
    readonly triggered: true;
} | {
    readonly triggered: false;
    readonly reason: CompositeSloSummaryRefreshSkippedReason;
};
export { postCompositeSloSummaryRefreshParamsSchema };
