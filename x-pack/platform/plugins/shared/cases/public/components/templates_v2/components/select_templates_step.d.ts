import React from 'react';
import type { ParsedTemplateEntry, ParseYamlError } from '../hooks/use_parse_yaml';
export interface SelectTemplatesStepProps {
    templates: ParsedTemplateEntry[];
    errors: ParseYamlError[];
    onSelectionChange?: (selected: ParsedTemplateEntry[]) => void;
    onRowClick?: (template: ParsedTemplateEntry) => void;
}
export declare const SelectTemplatesStep: React.FC<SelectTemplatesStepProps>;
