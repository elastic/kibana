import React from 'react';
import type { CustomFieldConfiguration } from '../../../common/types/domain';
import type { FormState } from '../configure_cases/flyout';
interface Props {
    onChange: (state: FormState<CustomFieldConfiguration>) => void;
    initialValue: CustomFieldConfiguration | null;
}
export declare const CustomFieldsForm: React.NamedExoticComponent<Props>;
export {};
