import React from 'react';
import type { TemplatesConfiguration } from '../../../common/types/domain';
export interface Props {
    templates: TemplatesConfiguration;
    onDeleteTemplate: (key: string) => void;
    onEditTemplate: (key: string) => void;
}
export declare const TemplatesList: React.NamedExoticComponent<Props>;
