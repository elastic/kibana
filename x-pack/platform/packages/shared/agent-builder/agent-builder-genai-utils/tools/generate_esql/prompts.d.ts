import type { BaseMessageLike } from '@langchain/core/messages';
import type { EsqlPrompts } from '@kbn/inference-plugin/server/tasks/nl_to_esql/doc_base/load_data';
import type { ResolvedResourceWithSampling } from '../utils/resources';
import type { Action } from './actions';
export declare const createRequestDocumentationPrompt: ({ nlQuery, resource, prompts, }: {
    nlQuery: string;
    resource: ResolvedResourceWithSampling;
    prompts: EsqlPrompts;
}) => BaseMessageLike[];
export declare const createGenerateEsqlPrompt: ({ nlQuery, resource, previousActions, prompts, additionalInstructions, additionalContext, rowLimit, disableNamedParams, }: {
    nlQuery: string;
    resource: ResolvedResourceWithSampling;
    prompts: EsqlPrompts;
    previousActions: Action[];
    additionalInstructions?: string;
    additionalContext?: string;
    rowLimit?: number;
    disableNamedParams?: boolean;
}) => BaseMessageLike[];
