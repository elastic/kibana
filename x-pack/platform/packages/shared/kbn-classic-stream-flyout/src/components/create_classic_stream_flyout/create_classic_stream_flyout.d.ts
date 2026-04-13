import React from 'react';
import type { TemplateListItem as IndexTemplate } from '@kbn/index-management-shared-types';
import { type StreamNameValidator, type IlmPolicyFetcher, type SimulatedTemplateFetcher } from '../../utils';
export declare enum ClassicStreamStep {
    SELECT_TEMPLATE = "select_template",
    NAME_AND_CONFIRM = "name_and_confirm"
}
interface CreateClassicStreamFlyoutProps {
    /** Callback when the flyout is closed */
    onClose: () => void;
    /**
     * Callback when the stream is created.
     * Receives the stream name which can be used to create the classic stream.
     */
    onCreate: (streamName: string) => Promise<void>;
    /** Callback to navigate to create template flow */
    onCreateTemplate: () => void;
    /** Available index templates to select from */
    templates: IndexTemplate[];
    /** Whether templates are currently being loaded */
    isLoadingTemplates?: boolean;
    /** Whether there was an error loading templates */
    hasErrorLoadingTemplates?: boolean;
    /** Callback to retry loading templates */
    onRetryLoadTemplates: () => void;
    /**
     * Async callback to validate the stream name.
     * Called after local empty field validation passes.
     * Should check for duplicate names and higher priority template conflicts.
     */
    onValidate?: StreamNameValidator;
    /**
     * Async callback to fetch ILM policy details by name.
     * If provided, ILM policy details will be displayed in the template details section.
     */
    getIlmPolicy?: IlmPolicyFetcher;
    /**
     * Async callback to fetch simulated template data by template name.
     * If provided, the resolved template data will be used in the template details section.
     */
    getSimulatedTemplate?: SimulatedTemplateFetcher;
}
export declare const CreateClassicStreamFlyout: ({ onClose, onCreate, onCreateTemplate, templates, isLoadingTemplates, hasErrorLoadingTemplates, onRetryLoadTemplates, onValidate, getIlmPolicy, getSimulatedTemplate, }: CreateClassicStreamFlyoutProps) => React.JSX.Element;
export {};
