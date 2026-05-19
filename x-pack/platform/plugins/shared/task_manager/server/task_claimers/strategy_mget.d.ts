import type { TaskClaimerOpts, ClaimOwnershipResult } from '.';
export declare function claimAvailableTasksMget(opts: TaskClaimerOpts): Promise<ClaimOwnershipResult>;
export declare const NO_ASSIGNED_PARTITIONS_WARNING_INTERVAL = 60000;
