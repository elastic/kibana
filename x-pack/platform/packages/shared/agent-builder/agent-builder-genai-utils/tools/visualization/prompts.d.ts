import type { BaseMessageLike } from '@langchain/core/messages';
import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
export declare const createGenerateConfigPrompt: ({ nlQuery, chartType, schema, existingConfig, additionalInstructions, additionalContext, }: {
    nlQuery: string;
    chartType: SupportedChartType;
    schema: object;
    existingConfig?: string;
    additionalInstructions?: string;
    additionalContext?: string;
}) => BaseMessageLike[];
