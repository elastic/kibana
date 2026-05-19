import React from 'react';
import type { ObservableTypesConfiguration } from '../../../common/types/domain';
export interface ObservableTypesProps {
    observableTypes: ObservableTypesConfiguration;
    disabled: boolean;
    isLoading: boolean;
    handleAddObservableType: () => void;
    handleDeleteObservableType: (key: string) => void;
    handleEditObservableType: (key: string) => void;
}
export declare const ObservableTypes: React.NamedExoticComponent<ObservableTypesProps>;
