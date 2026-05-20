import type { Logger } from '@kbn/logging';
import type { AuthorizationServiceSetup } from '@kbn/security-plugin-types-server';
import type { SmlService, SmlTypeDefinition, SmlSearchFilters } from './types';
export interface SmlServiceSetup {
    /**
     * Register an SML type definition.
     * Should be called during plugin setup.
     */
    registerType: (definition: SmlTypeDefinition) => void;
}
export interface SmlServiceStartDeps {
    logger: Logger;
    securityAuthz?: AuthorizationServiceSetup;
}
export interface SmlServiceInstance {
    setup: (deps: {
        logger: Logger;
    }) => SmlServiceSetup;
    start: (deps: SmlServiceStartDeps) => SmlService;
}
export declare const createSmlService: () => SmlServiceInstance;
export declare const isNotFoundError: (error: unknown) => boolean;
/**
 * Build an ES filter clause from per-type SML search filters.
 *
 * For each type with an `ids` constraint, the filter returns documents that
 * either (a) match the type AND have an origin_id in the list, or (b) are
 * NOT of the constrained type. Types without filters are unaffected.
 */
export declare const buildTypeFilters: (filters: SmlSearchFilters | undefined) => Record<string, unknown> | undefined;
