import React from 'react';
import type { CasesConfigurationUITemplate } from '../../../common/ui';
interface Props {
    disabled: boolean;
    isLoading: boolean;
    templates: CasesConfigurationUITemplate[];
    onAddTemplate: () => void;
    onEditTemplate: (key: string) => void;
    onDeleteTemplate: (key: string) => void;
}
export declare const Templates: React.NamedExoticComponent<Props>;
export {};
