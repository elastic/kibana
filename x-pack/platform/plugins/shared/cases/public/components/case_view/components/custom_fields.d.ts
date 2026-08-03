import React from 'react';
import type { CasesConfigurationUI, CaseUICustomField } from '../../../../common/ui';
import type { CaseUI } from '../../../../common';
interface Props {
    isLoading: boolean;
    customFields: CaseUI['customFields'];
    customFieldsConfiguration: CasesConfigurationUI['customFields'];
    onSubmit: (customField: CaseUICustomField) => void;
    /** Defaults to classic (legacy case view). Redesign passes `inline`. */
    editVariant?: 'classic' | 'inline';
}
export declare const CustomFields: React.NamedExoticComponent<Props>;
export {};
