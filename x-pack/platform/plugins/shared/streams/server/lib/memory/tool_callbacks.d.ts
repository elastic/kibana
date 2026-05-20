import type { Logger } from '@kbn/logging';
import type { MemoryService } from './types';
/**
 * Format memory entries as a summary string for LLM context.
 */
export declare const formatExistingPages: (entries: Array<{
    name: string;
    title: string;
    categories: string[];
}>) => string;
/**
 * Create a read_memory_page tool callback for use with executeAsReasoningAgent.
 */
export declare const createReadMemoryPageCallback: ({ memory }: {
    memory: MemoryService;
}) => (toolCall: {
    function: {
        arguments: {
            name: string;
        };
    };
}) => Promise<{
    response: {
        error: string;
        id?: undefined;
        name?: undefined;
        title?: undefined;
        content?: undefined;
        categories?: undefined;
        references?: undefined;
    };
} | {
    response: {
        id: string;
        name: string;
        title: string;
        content: string;
        categories: string[];
        references: string[];
        error?: undefined;
    };
}>;
/**
 * Create a write_memory_page tool callback for use with executeAsReasoningAgent.
 */
export declare const createWriteMemoryPageCallback: ({ memory, user, logger, changeSummary, }: {
    memory: MemoryService;
    user: string;
    logger: Logger;
    changeSummary: string;
}) => (toolCall: {
    function: {
        arguments: {
            name: string;
            title: string;
            content: string;
            categories?: string[];
            references?: string[];
            tags?: string[];
        };
    };
}) => Promise<{
    response: {
        success: boolean;
        action: string;
        name: string;
    };
}>;
