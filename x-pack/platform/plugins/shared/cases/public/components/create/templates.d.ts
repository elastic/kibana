import React from 'react';
import type { CasesConfigurationUI, CasesConfigurationUITemplate } from '../../containers/types';
interface Props {
    isLoading: boolean;
    templates: CasesConfigurationUI['templates'];
    initialTemplate?: CasesConfigurationUI['templates'][number];
    isDisabled?: boolean;
    onTemplateChange: ({ caseFields, key, }: Pick<CasesConfigurationUITemplate, 'caseFields' | 'key'>) => void;
}
export declare const TemplateSelectorComponent: React.FC<Props>;
export declare const TemplateSelector: React.NamedExoticComponent<Props>;
export {};
