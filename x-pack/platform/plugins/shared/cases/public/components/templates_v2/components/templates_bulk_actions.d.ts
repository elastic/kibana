import React from 'react';
import type { Template } from '../../../../common/types/domain/template/v1';
export interface TemplatesBulkActionsProps {
    selectedTemplates: Template[];
    onActionSuccess?: () => void;
}
export declare const TemplatesBulkActions: React.NamedExoticComponent<TemplatesBulkActionsProps>;
