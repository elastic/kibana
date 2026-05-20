import type { AiopsLogRateAnalysisSchema } from '../api/schema';
export declare const getRequestBase: ({ index, projectRouting }: AiopsLogRateAnalysisSchema) => {
    project_routing?: string | undefined;
    index: string;
    ignore_unavailable: boolean;
};
