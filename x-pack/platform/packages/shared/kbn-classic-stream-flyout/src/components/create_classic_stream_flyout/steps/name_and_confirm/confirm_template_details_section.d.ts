import React from 'react';
import type { TemplateListItem as IndexTemplate } from '@kbn/index-management-shared-types';
import { type IlmPolicyFetcher, type SimulatedTemplateFetcher } from '../../../../utils';
interface ConfirmTemplateDetailsSectionProps {
    template: IndexTemplate;
    getIlmPolicy?: IlmPolicyFetcher;
    getSimulatedTemplate?: SimulatedTemplateFetcher;
}
export declare const ConfirmTemplateDetailsSection: ({ template, getIlmPolicy, getSimulatedTemplate, }: ConfirmTemplateDetailsSectionProps) => React.JSX.Element;
export {};
