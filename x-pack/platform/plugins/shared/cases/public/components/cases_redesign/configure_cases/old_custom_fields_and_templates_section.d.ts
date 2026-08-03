import React from 'react';
import type { ActionConnector } from '../../../../common/types/domain';
import type { CasesConfigurationUI } from '../../../containers/types';
import type { ClosureType } from '../../../containers/configure/types';
type LegacyFlyoutType = 'customField' | 'template';
export interface OldCustomFieldsAndTemplatesSectionProps {
    configurationId: string;
    configurationVersion: string;
    closureType: ClosureType;
    connector: CasesConfigurationUI['connector'];
    customFields: CasesConfigurationUI['customFields'];
    templates: CasesConfigurationUI['templates'];
    connectors: ActionConnector[];
    isLoadingCaseConfiguration: boolean;
    persistCaseConfigure: (params: {
        connector: CasesConfigurationUI['connector'];
        customFields: CasesConfigurationUI['customFields'];
        templates: CasesConfigurationUI['templates'];
        id: string;
        version: string;
        closureType: ClosureType;
    }) => void;
    flyOutVisibility: {
        type: LegacyFlyoutType | string;
        visible: boolean;
    } | null;
    setFlyOutVisibility: (value: {
        type: LegacyFlyoutType;
        visible: boolean;
    } | null) => void;
}
export declare const OldCustomFieldsAndTemplatesSection: React.FC<OldCustomFieldsAndTemplatesSectionProps>;
export {};
