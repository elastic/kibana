import { z } from '@kbn/zod/v4';
export declare const sharedI18nMessages: {
    toolId: {
        requiredError: string;
        tooLongError: string;
        formatError: string;
        reservedError: (name: string) => string;
        protectedNamespaceError: (name: string) => string;
    };
    description: {
        requiredError: string;
    };
};
export declare const sharedValidationSchemas: {
    toolId: z.ZodString;
    description: z.ZodString;
    labels: z.ZodArray<z.ZodString>;
};
