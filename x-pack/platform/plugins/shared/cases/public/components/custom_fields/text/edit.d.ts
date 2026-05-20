import React from 'react';
import { CustomFieldTypes } from '../../../../common/types/domain';
import type { CasesConfigurationUICustomField } from '../../../../common/ui';
export declare const Edit: React.NamedExoticComponent<{
    customField?: {
        key: string;
        type: CustomFieldTypes.TEXT;
        value: string | null;
    } | undefined;
    customFieldConfiguration: CasesConfigurationUICustomField;
    onSubmit: (customField: {
        key: string;
        type: CustomFieldTypes.TEXT;
        value: string | null;
    }) => void;
    isLoading: boolean;
    canUpdate: boolean;
}>;
