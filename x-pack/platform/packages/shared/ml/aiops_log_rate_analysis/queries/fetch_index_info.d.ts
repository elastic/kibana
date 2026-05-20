import type { AiopsLogRateAnalysisSchema } from '../api/schema';
import { type FetchFieldCandidatesParams, type FetchFieldCandidatesParamsArguments } from './fetch_field_candidates';
export interface FetchIndexInfoParamsArguments {
    skipFieldCandidates?: boolean;
}
export interface FetchIndexInfoParams extends FetchFieldCandidatesParams {
    arguments: AiopsLogRateAnalysisSchema & FetchFieldCandidatesParamsArguments & FetchIndexInfoParamsArguments;
}
export interface FetchIndexInfoResponse {
    keywordFieldCandidates: string[];
    textFieldCandidates: string[];
    baselineTotalDocCount: number;
    deviationTotalDocCount: number;
    zeroDocsFallback: boolean;
}
export declare const fetchIndexInfo: ({ esClient, abortSignal, arguments: args, }: FetchIndexInfoParams) => Promise<FetchIndexInfoResponse>;
