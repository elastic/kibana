import type { SavedObject } from '@kbn/core/server';
import type { Template, CreateTemplateInput, UpdateTemplateInput } from '../../../common/types/domain/template/latest';
import type { TemplatesFindRequest, TemplatesFindResponse } from '../../../common/types/api/template/v1';
import type { CasesClientArgs } from '../types';
/**
 * API for interacting with templates.
 */
export interface TemplatesSubClient {
    getAllTemplates(params: TemplatesFindRequest): Promise<TemplatesFindResponse>;
    getTemplate(templateId: string, version?: string, options?: {
        includeDeleted?: boolean;
    }): Promise<SavedObject<Template> | undefined>;
    createTemplate(input: CreateTemplateInput): Promise<SavedObject<Template>>;
    updateTemplate(templateId: string, input: UpdateTemplateInput): Promise<SavedObject<Template>>;
    deleteTemplate(templateId: string): Promise<void>;
    getTags(): Promise<string[]>;
    getAuthors(): Promise<string[]>;
}
/**
 * Creates the interface for templates.
 *
 * @ignore
 */
export declare const createTemplatesSubClient: (clientArgs: CasesClientArgs) => TemplatesSubClient;
