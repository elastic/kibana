import type { RouteDependencies } from './types';
/**
 * Registers POST /api/agent_builder/agents/{agent_id}/consumption
 *
 * Public, Tech Preview route. Requires the manageAgents privilege.
 * Returns paginated, per-conversation token consumption data across all users
 * for a given agent. Uses search_after cursor pagination and Painless scripted
 * fields to aggregate token usage.
 *
 * Changed from the internal GET route to a public versioned POST so that
 * structured params (search_after array, usernames array) are passed in the
 * request body instead of encoded query strings.
 */
export declare function registerConsumptionRoutes({ router, getInternalServices, logger, }: RouteDependencies): void;
