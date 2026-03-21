import type { ModelProvider } from '@kbn/agent-builder-server';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
export declare function guessChartType(modelProvider: ModelProvider, nlQuery: string, existingType?: string): Promise<SupportedChartType>;
