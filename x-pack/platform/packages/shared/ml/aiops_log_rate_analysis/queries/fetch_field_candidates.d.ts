import type { ElasticsearchClient } from '@kbn/core/server';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { AiopsLogRateAnalysisSchema } from '../api/schema';
export declare const TEXT_FIELD_SAFE_LIST: string[];
export declare const SUPPORTED_ES_FIELD_TYPES: ES_FIELD_TYPES[];
export declare const SUPPORTED_ES_FIELD_TYPES_TEXT: ES_FIELD_TYPES[];
export interface FetchFieldCandidatesParamsArguments {
    textFieldCandidatesOverrides?: string[];
}
export interface FetchFieldCandidatesParams {
    esClient: ElasticsearchClient;
    abortSignal?: AbortSignal;
    arguments: AiopsLogRateAnalysisSchema & FetchFieldCandidatesParamsArguments;
}
export interface FetchFieldCandidatesResponse {
    isECS: boolean;
    keywordFieldCandidates: string[];
    selectedKeywordFieldCandidates: string[];
    textFieldCandidates: string[];
    selectedTextFieldCandidates: string[];
}
export declare const fetchFieldCandidates: ({ esClient, abortSignal, arguments: args, }: FetchFieldCandidatesParams) => Promise<FetchFieldCandidatesResponse>;
