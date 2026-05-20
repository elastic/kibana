import type { ToolSchema } from '@kbn/inference-common';
import { type InsightCore } from '@kbn/streams-schema';
import type { z } from '@kbn/zod/v4';
export declare const SUBMIT_INSIGHTS_TOOL_NAME = "submit_insights";
export declare const insightsSchema: ToolSchema;
export declare function parseInsightsWithErrors(data: unknown): {
    insights: InsightCore[];
    errors: z.ZodError | null;
};
