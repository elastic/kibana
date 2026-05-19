import type { FailedAttempt } from '../../../types';
export declare function updateUninstallFailedAttempts({ error, createdAt, latestAttempts, }: {
    error: Error;
    createdAt: string;
    latestAttempts?: FailedAttempt[];
}): FailedAttempt[];
