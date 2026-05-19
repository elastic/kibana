import React from 'react';
import type { ObservableTypesConfiguration } from '../../../../common/types/domain';
export interface ObservableTypesListProps {
    disabled: boolean;
    observableTypes: ObservableTypesConfiguration;
    onDeleteObservableType: (key: string) => void;
    onEditObservableType: (key: string) => void;
}
export declare const ObservableTypesList: React.NamedExoticComponent<ObservableTypesListProps>;
