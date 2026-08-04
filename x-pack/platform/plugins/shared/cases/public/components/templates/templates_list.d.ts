import React from 'react';
import type { TemplatesConfiguration } from '../../../common/types/domain';
export interface Props {
    templates: TemplatesConfiguration;
    onDeleteTemplate: (key: string) => void;
    onEditTemplate: (key: string) => void;
    /**
     * Renders the list as line-separated rows instead of individual panels.
     * Only used by the cases redesign settings page.
     */
    useLineSeparators?: boolean;
}
export declare const TemplatesList: React.NamedExoticComponent<Props>;
