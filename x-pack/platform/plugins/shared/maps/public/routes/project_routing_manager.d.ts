import type { ProjectRouting } from '@kbn/es-query';
/**
 * Initializes project routing manager for Maps app.
 * Handles subscription to CPS project picker changes and project routing overrides.
 *
 * @param onProjectRoutingChange - Callback invoked when project routing changes
 * @returns Cleanup function to unsubscribe and cleanup resources
 */
export declare function initializeProjectRoutingManager({ onProjectRoutingChange, }: {
    onProjectRoutingChange: (projectRouting: ProjectRouting) => void;
}): (() => void) | undefined;
