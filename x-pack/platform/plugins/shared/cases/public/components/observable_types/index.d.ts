import React from 'react';
import type { ObservableTypesConfiguration } from '../../../common/types/domain';
export interface ObservableTypesProps {
    observableTypes: ObservableTypesConfiguration;
    disabled: boolean;
    hideTitle?: boolean;
    isLoading: boolean;
    handleAddObservableType: () => void;
    handleDeleteObservableType: (key: string) => void;
    handleEditObservableType: (key: string) => void;
    /**
     * Renders the list without the surrounding subdued panel, as line-separated
     * rows. Only used by the cases redesign settings page.
     */
    useLineSeparators?: boolean;
}
export declare const ObservableTypes: React.NamedExoticComponent<ObservableTypesProps>;
