import React from 'react';
import { CustomFieldTypes } from '../../../../common/types/domain';
import type { CasesConfigurationUICustomField } from '../../../../common/ui';
export declare const Edit: React.NamedExoticComponent<{
    customField?: {
        key: string;
        type: CustomFieldTypes.NUMBER;
        value: number | null;
    } | undefined;
    customFieldConfiguration: CasesConfigurationUICustomField;
    onSubmit: (customField: {
        key: string;
        type: CustomFieldTypes.NUMBER;
        value: number | null;
    }) => void;
    isLoading: boolean;
    canUpdate: boolean;
}>;
