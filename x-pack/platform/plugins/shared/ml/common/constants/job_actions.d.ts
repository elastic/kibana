export declare const JOB_ACTION: {
    readonly DELETE: "delete";
    readonly RESET: "reset";
    readonly REVERT: "revert";
};
export type JobAction = (typeof JOB_ACTION)[keyof typeof JOB_ACTION];
export type JobActionState = 'deleting' | 'resetting' | 'reverting';
export declare function getJobActionString(action: JobAction): JobActionState;
export declare const JOB_ACTION_TASK: Record<string, JobAction>;
export declare const JOB_ACTION_TASKS: string[];
