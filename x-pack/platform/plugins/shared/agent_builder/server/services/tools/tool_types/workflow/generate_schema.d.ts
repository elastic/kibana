import { z } from '@kbn/zod/v4';
import type { WorkflowDetailDto } from '@kbn/workflows/types/v1';
export declare const generateSchema: ({ workflow }: {
    workflow: WorkflowDetailDto;
}) => z.ZodObject<any>;
