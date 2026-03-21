import type { Logger } from '@kbn/logging';
import type { AuthorizationServiceSetup } from '@kbn/security-plugin-types-server';
import type { SmlService, SmlTypeDefinition } from './types';
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
