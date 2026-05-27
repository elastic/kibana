import type { ConcreteTaskInstance, TaskDefinition } from '../task';
export declare function getRetryAt(task: ConcreteTaskInstance, taskDefinition: TaskDefinition | undefined): Date | undefined;
export declare function getRetryDate({ error, attempts, addDuration, }: {
    error: Error;
    attempts: number;
    addDuration?: string;
}): Date | undefined;
export declare function calculateDelayBasedOnAttempts(attempts: number): number;
export declare function getTimeout(task: ConcreteTaskInstance, taskDefinition: TaskDefinition | undefined): string;
