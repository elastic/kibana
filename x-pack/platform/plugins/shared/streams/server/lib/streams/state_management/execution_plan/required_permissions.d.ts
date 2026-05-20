import type { ActionsByType } from './types';
export interface RequiredPermissions {
    cluster: string[];
    index: Record<string, string[]>;
}
export declare function mergeRequiredPermissions(permissions: RequiredPermissions[]): RequiredPermissions;
export declare function getRequiredPermissionsForActions({ actionsByType, isServerless, }: {
    actionsByType: ActionsByType;
    isServerless: boolean;
}): RequiredPermissions;
