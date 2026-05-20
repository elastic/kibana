import type { Logger, SavedObjectsClientContract, SavedObjectsCreateOptions } from '@kbn/core/server';
import type { PromptsConfigAttributes } from './prompts_config';
export type { PromptsConfigAttributes };
export declare class PromptsConfigService {
    private readonly soClient;
    private readonly logger;
    constructor({ soClient, logger }: {
        soClient: SavedObjectsClientContract;
        logger: Logger;
    });
    /**
     * Upsert a new prompt saved object.
     * attributes is a plain object (e.g. { name, systemPromptTemplate, userPromptTemplate, inputExample })
     * Note: no forced singleton id/overwrite — allow multiple prompt objects (user-created).
     */
    upsertPrompt(attributes: PromptsConfigAttributes, options?: SavedObjectsCreateOptions): Promise<{
        featurePromptOverride: any;
        significantEventsPromptOverride: any;
        descriptionPromptOverride: any;
    }>;
    getPrompt(): Promise<{
        featurePromptOverride: any;
        significantEventsPromptOverride: any;
        descriptionPromptOverride: any;
    }>;
    /**
     * Delete the prompts saved object (reset to defaults).
     */
    resetPrompts(): Promise<void>;
}
