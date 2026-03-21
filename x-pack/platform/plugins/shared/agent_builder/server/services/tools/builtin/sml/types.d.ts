import type { SmlService } from '../../../sml';
/**
 * Options for creating SML tools.
 * Uses a getter for lazy resolution — the SML service start contract
 * is not available until after plugin start.
 */
export interface SmlToolsOptions {
    /** Lazy getter for the SML service (resolved at handler invocation time). */
    getSmlService: () => SmlService;
}
