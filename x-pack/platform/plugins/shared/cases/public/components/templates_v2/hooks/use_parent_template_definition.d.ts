import type { z } from '@kbn/zod/v4';
import type { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/v1';
type ParsedTemplateDefinition = z.infer<typeof ParsedTemplateDefinitionSchema>;
export interface UseParentTemplateDefinitionResult {
    definition: ParsedTemplateDefinition | undefined;
    isFetched: boolean;
}
export declare const useParentTemplateDefinition: (parentId: string | undefined) => UseParentTemplateDefinitionResult;
export {};
