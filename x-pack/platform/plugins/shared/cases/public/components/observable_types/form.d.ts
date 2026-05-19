import React from 'react';
import type { ObservableTypeConfiguration } from '../../../common/types/domain';
import type { FormState } from '../configure_cases/flyout';
export interface ObservableTypesFormProps {
    onChange: (state: FormState<ObservableTypeConfiguration>) => void;
    initialValue: ObservableTypeConfiguration | null;
}
export declare const ObservableTypesForm: React.NamedExoticComponent<ObservableTypesFormProps>;
