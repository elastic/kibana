import React from 'react';
import type { ObservableTypesConfiguration } from '../../../../common/types/domain';
export interface ObservableTypesListProps {
    disabled: boolean;
    observableTypes: ObservableTypesConfiguration;
    onDeleteObservableType: (key: string) => void;
    onEditObservableType: (key: string) => void;
    /**
     * Renders the list as line-separated rows instead of individual panels.
     * Only used by the cases redesign settings page.
     */
    useLineSeparators?: boolean;
}
export declare const ObservableTypesList: React.NamedExoticComponent<ObservableTypesListProps>;
