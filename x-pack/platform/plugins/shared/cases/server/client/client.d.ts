import type { CasesClientArgs } from './types';
import type { CasesSubClient } from './cases/client';
import type { AttachmentsSubClient } from './attachments/client';
import type { UserActionsSubClient } from './user_actions/client';
import type { ConfigureSubClient } from './configure/client';
import type { MetricsSubClient } from './metrics/client';
import type { TemplatesSubClient } from './templates/client';
import type { FieldDefinitionsSubClient } from './field_definitions/client';
/**
 * Client wrapper that contains accessor methods for individual entities within the cases system.
 */
export declare class CasesClient {
    private readonly _casesClientInternal;
    private readonly _cases;
    private readonly _attachments;
    private readonly _userActions;
    private readonly _configure;
    private readonly _metrics;
    private readonly _templates;
    private readonly _fieldDefinitions;
    constructor(args: CasesClientArgs);
    /**
     * Retrieves an interface for interacting with templates.
     */
    get templates(): TemplatesSubClient;
    /**
     * Retrieves an interface for interacting with the reusable field definitions library.
     */
    get fieldDefinitions(): FieldDefinitionsSubClient;
    /**
     * Retrieves an interface for interacting with cases entities.
     */
    get cases(): CasesSubClient;
    /**
     * Retrieves an interface for interacting with attachments (comments) entities.
     */
    get attachments(): AttachmentsSubClient;
    /**
     * Retrieves an interface for interacting with the user actions associated with the plugin entities.
     */
    get userActions(): UserActionsSubClient;
    /**
     * Retrieves an interface for interacting with the configuration of external connectors for the plugin entities.
     */
    get configure(): ConfigureSubClient;
    /**
     * Retrieves an interface for retrieving metrics related to the cases entities.
     */
    get metrics(): MetricsSubClient;
}
/**
 * Creates a {@link CasesClient} for interacting with the cases entities
 *
 * @param args arguments for initializing the cases client
 * @returns a {@link CasesClient}
 *
 * @ignore
 */
export declare const createCasesClient: (args: CasesClientArgs) => CasesClient;
