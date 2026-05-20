import { z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
export declare const mcpToolFormValidationSchema: z.ZodObject<{
    connectorId: z.ZodString;
    mcpToolName: z.ZodString;
    type: z.ZodLiteral<ToolType.mcp>;
    toolId: z.ZodString;
    description: z.ZodString;
    labels: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
