import React from 'react';
import { CustomFieldTypes } from '../../../../common/types/domain';
export declare const Edit: React.NamedExoticComponent<{
    customField?: {
        key: string;
        type: CustomFieldTypes.TOGGLE;
        value: boolean | null;
    } | undefined;
    customFieldConfiguration: import("../../../containers/types").CasesConfigurationUICustomField;
    onSubmit: (customField: {
        key: string;
        type: CustomFieldTypes.TOGGLE;
        value: boolean | null;
    }) => void;
    isLoading: boolean;
    canUpdate: boolean;
}>;
