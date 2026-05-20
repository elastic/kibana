import type { Logger } from '@kbn/logging';
import type { InboxRouter } from '../types';
import type { InboxActionRegistry } from '../services/inbox_action_registry';
import type { InboxSpaceIdResolver } from '../plugin';
export interface RouteDependencies {
    router: InboxRouter;
    logger: Logger;
    registry: InboxActionRegistry;
    /**
     * Per-request resolver for the active space id. Routes MUST consult this
     * rather than defaulting to `'default'` — passing a bogus space id to
     * providers silently leaks cross-space data (or, for the respond route,
     * targets the wrong execution).
     */
    getSpaceId: InboxSpaceIdResolver;
}
export declare const registerRoutes: (dependencies: RouteDependencies) => void;
