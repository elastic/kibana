import type { CreateTemplateInput, ParsedTemplate, Template } from '../../../../common/types/domain/template/v1';
import type { TemplatesFindRequest, TemplatesFindResponse } from '../../../../common/types/api/template/v1';
import type { TemplateUpdateRequest, BulkDeleteTemplatesResponse, BulkExportTemplatesResponse } from '../types';
export declare const postTemplate: ({ template, signal, }: {
    template: CreateTemplateInput;
    signal?: AbortSignal;
}) => Promise<Template>;
export declare const getTemplates: ({ signal, queryParams, }: {
    signal?: AbortSignal;
    queryParams: TemplatesFindRequest;
}) => Promise<TemplatesFindResponse>;
export declare const getTemplate: ({ templateId, version, includeDeleted, signal, }: {
    templateId: string;
    version?: number;
    includeDeleted?: boolean;
    signal?: AbortSignal;
}) => Promise<ParsedTemplate>;
export declare const patchTemplate: ({ templateId, template, }: {
    templateId: string;
    template: TemplateUpdateRequest;
    signal?: AbortSignal;
}) => Promise<Template>;
export declare const bulkDeleteTemplates: ({ templateIds, signal, }: {
    templateIds: string[];
    signal?: AbortSignal;
}) => Promise<BulkDeleteTemplatesResponse>;
export declare const bulkExportTemplates: ({ templateIds, signal, }: {
    templateIds: string[];
    signal?: AbortSignal;
}) => Promise<BulkExportTemplatesResponse>;
export declare const getTemplateTags: ({ signal, }?: {
    signal?: AbortSignal;
}) => Promise<string[]>;
export declare const getTemplateCreators: ({ signal, }?: {
    signal?: AbortSignal;
}) => Promise<string[]>;
