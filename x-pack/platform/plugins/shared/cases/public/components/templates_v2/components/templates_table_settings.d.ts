import React from 'react';
import type { Template } from '../../../../common/types/domain/template/v1';
export interface TemplatesTableSettingsProps {
    rangeStart: number;
    rangeEnd: number;
    totalTemplates: number;
    selectedTemplates: Template[];
    onBulkActionSuccess: () => void;
    hasFilters: boolean;
    onClearFilters: () => void;
}
export declare const TemplatesTableSettings: React.NamedExoticComponent<TemplatesTableSettingsProps>;
