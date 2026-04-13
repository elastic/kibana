import type { StreamQuery } from '@kbn/streams-schema';
export declare function validateQuery(query: Partial<StreamQuery>): {
    title: {
        isInvalid: boolean;
        error?: string;
    };
    kql: {
        isInvalid: boolean;
        error?: string;
    };
};
