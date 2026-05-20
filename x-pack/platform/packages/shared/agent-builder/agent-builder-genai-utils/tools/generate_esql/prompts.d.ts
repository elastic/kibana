import type { BaseMessageLike } from '@langchain/core/messages';
import type { ResolvedResourceWithSampling } from '../utils/resources';
import type { Action } from './actions';
import type { EsqlLoadedDocumentation } from './documentation';
export declare const createRequestDocumentationPrompt: ({ nlQuery, resource, documentation, }: {
    nlQuery: string;
    resource: ResolvedResourceWithSampling;
    documentation: EsqlLoadedDocumentation;
}) => BaseMessageLike[];
export declare const createGenerateEsqlPrompt: ({ nlQuery, resource, documentation, previousActions, additionalInstructions, additionalContext, rowLimit, disableNamedParams, }: {
    nlQuery: string;
    resource: ResolvedResourceWithSampling;
    documentation: EsqlLoadedDocumentation;
    previousActions: Action[];
    additionalInstructions?: string;
    additionalContext?: string;
    rowLimit?: number;
    disableNamedParams?: boolean;
}) => BaseMessageLike[];
