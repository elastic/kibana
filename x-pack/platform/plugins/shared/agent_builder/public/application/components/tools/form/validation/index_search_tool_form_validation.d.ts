import { ToolType } from '@kbn/agent-builder-common/tools';
import { z } from '@kbn/zod/v4';
import type { ToolsService } from '../../../../../services';
export declare const createIndexSearchFormValidationSchema: (toolsService: ToolsService) => z.ZodObject<{
    toolId: z.ZodString;
    description: z.ZodString;
    labels: z.ZodArray<z.ZodString>;
    pattern: z.ZodString;
    rowLimit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    customInstructions: z.ZodOptional<z.ZodString>;
    type: z.ZodLiteral<ToolType.index_search>;
}, z.core.$strip>;
