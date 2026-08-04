import React from 'react';
import type { ParsedTemplateDefinition } from '../../../../common/types/domain/template/v1';
import type { OnCaseDefaultChange } from '../case_default_fields';
interface TemplateCaseDefaultsFormProps {
    parsedTemplate: ParsedTemplateDefinition;
    onChange?: OnCaseDefaultChange;
}
export declare const TemplateCaseDefaultsForm: React.FC<TemplateCaseDefaultsFormProps>;
export {};
