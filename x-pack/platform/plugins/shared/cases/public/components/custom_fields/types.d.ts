import type React from 'react';
import type { EuiTableComputedColumnType } from '@elastic/eui';
import type { CaseCustomField, CustomFieldTypes } from '../../../common/types/domain';
import type { CasesConfigurationUICustomField, CaseUI, CaseUICustomField } from '../../containers/types';
export interface CustomFieldType<T extends CaseUICustomField> {
    Configure: React.FC;
    View: React.FC<{
        customField?: T;
    }>;
    Edit: React.FC<{
        customField?: T;
        customFieldConfiguration: CasesConfigurationUICustomField;
        onSubmit: (customField: T) => void;
        isLoading: boolean;
        canUpdate: boolean;
        /**
         * `classic` — pencil + view mode (legacy case view).
         * `inline` — always-visible input with confirm/cancel (redesign case view).
         */
        editVariant?: 'classic' | 'inline';
    }>;
    Create: React.FC<{
        customFieldConfiguration: CasesConfigurationUICustomField;
        isLoading: boolean;
        setAsOptional?: boolean;
        setDefaultValue?: boolean;
    }>;
}
export interface CustomFieldFactoryFilterOption {
    key: string;
    label: string;
    value: boolean | null;
}
export type CustomFieldEuiTableColumn = Omit<EuiTableComputedColumnType<CaseUI>, 'render'> & {
    render: EuiTableComputedColumnType<CaseCustomField>['render'];
};
export type CustomFieldFactory<T extends CaseUICustomField> = () => {
    id: string;
    label: string;
    getEuiTableColumn: (params: {
        label: string;
    }) => CustomFieldEuiTableColumn;
    build: () => CustomFieldType<T>;
    filterOptions?: CustomFieldFactoryFilterOption[];
    getDefaultValue?: () => string | boolean | null;
    convertNullToEmpty?: (value: string | number | boolean | null) => string;
};
export type CustomFieldBuilderMap = {
    readonly [key in CustomFieldTypes]: CustomFieldFactory<CaseUICustomField>;
};
