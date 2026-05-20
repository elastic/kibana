import type { AgentTargetVersion } from '../types';
export declare function removeSOAttributes(kuery: string): string;
export declare function getSortConfig(sortField: string, sortOrder: 'asc' | 'desc'): Array<Record<string, {
    order: 'asc' | 'desc';
}>>;
export declare function checkTargetVersionsValidity(requiredVersions: AgentTargetVersion[]): string | undefined;
