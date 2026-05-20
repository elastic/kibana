import type { FC } from 'react';
import type { z } from '@kbn/zod/v4';
import type { ParsedTemplateDefinitionSchema } from '../../../../common/types/domain/template/v1';
type ParsedTemplateDefinition = z.infer<typeof ParsedTemplateDefinitionSchema>;
export interface TemplateMetadataPreviewProps {
    parsedTemplate: ParsedTemplateDefinition;
}
export declare const TemplateMetadataPreview: FC<TemplateMetadataPreviewProps>;
export {};
