import { z } from '@kbn/zod/v4';
export declare const bulkImportMcpI18nMessages: {
    connectorId: {
        requiredError: string;
    };
    tools: {
        requiredError: string;
    };
    namespace: {
        requiredError: string;
        tooLongError: string;
        formatError: string;
        protectedNamespaceError: (name: string) => string;
        conflictError: string;
    };
};
export declare const useBulkImportMcpToolFormValidationSchema: () => z.ZodObject<{
    connectorId: z.ZodString;
    tools: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
    }, z.core.$strip>>;
    namespace: z.ZodString;
    labels: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
