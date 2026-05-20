import { ToolType } from '@kbn/agent-builder-common/tools';
import { z } from '@kbn/zod/v4';
import type { ToolsService } from '../../../../../services';
export declare const createWorkflowFormValidationSchema: (toolsService: ToolsService) => z.ZodObject<{
    toolId: z.ZodString;
    description: z.ZodString;
    labels: z.ZodArray<z.ZodString>;
    workflow_id: z.ZodString;
    wait_for_completion: z.ZodBoolean;
    type: z.ZodLiteral<ToolType.workflow>;
}, z.core.$strip>;
