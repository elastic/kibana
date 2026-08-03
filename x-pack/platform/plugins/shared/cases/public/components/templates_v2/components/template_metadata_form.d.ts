import React from 'react';
import type { TemplateMetadata, TemplateMetadataErrors } from '../utils/template_metadata';
interface TemplateMetadataFormProps {
    metadata: TemplateMetadata;
    errors: TemplateMetadataErrors;
    onChange: (metadata: TemplateMetadata) => void;
    compact?: boolean;
}
export declare const TemplateMetadataForm: React.FC<TemplateMetadataFormProps>;
export {};
