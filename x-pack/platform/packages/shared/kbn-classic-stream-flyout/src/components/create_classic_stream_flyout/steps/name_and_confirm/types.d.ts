import type { TemplateListItem as IndexTemplate } from '@kbn/index-management-shared-types';
import type { IlmPolicyFetcher, SimulatedTemplateFetcher, ValidationErrorType } from '../../../../utils';
export interface NameAndConfirmBaseProps {
    selectedIndexPattern: string;
    streamNameParts: string[];
    onIndexPatternChange: (pattern: string) => void;
    onStreamNamePartsChange: (parts: string[]) => void;
    validationError: ValidationErrorType;
    conflictingIndexPattern?: string;
}
export interface NameAndConfirmStepProps extends NameAndConfirmBaseProps {
    template: IndexTemplate;
    getIlmPolicy?: IlmPolicyFetcher;
    getSimulatedTemplate?: SimulatedTemplateFetcher;
}
export interface NameStreamSectionProps extends NameAndConfirmBaseProps {
    indexPatterns: string[];
}
