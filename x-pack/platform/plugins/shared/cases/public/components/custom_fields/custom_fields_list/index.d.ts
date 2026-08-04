import React from 'react';
import type { CustomFieldsConfiguration } from '../../../../common/types/domain';
export interface Props {
    customFields: CustomFieldsConfiguration;
    onDeleteCustomField: (key: string) => void;
    onEditCustomField: (key: string) => void;
    /**
     * Renders the list as line-separated rows instead of individual panels.
     * Only used by the cases redesign settings page.
     */
    useLineSeparators?: boolean;
}
export declare const CustomFieldsList: React.NamedExoticComponent<Props>;
