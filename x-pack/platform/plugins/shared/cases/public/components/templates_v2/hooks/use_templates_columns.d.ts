import type { EuiTableActionsColumnType, EuiTableComputedColumnType, EuiTableFieldDataColumnType } from '@elastic/eui';
import type { Template } from '../../../../common/types/domain/template/v1';
import type { TemplateListItem } from '../../../../common/types/api/template/v1';
type TemplatesColumns = EuiTableActionsColumnType<TemplateListItem> | EuiTableComputedColumnType<TemplateListItem> | EuiTableFieldDataColumnType<TemplateListItem>;
export interface UseTemplatesColumnsProps {
    onEdit: (template: Template) => void;
    onClone: (template: Template) => void;
    onExport: (template: Template) => void;
    onDelete: (template: Template) => void;
    disableActions?: boolean;
    onIsEnabledChange: (template: Template) => void;
}
export declare const useTemplatesColumns: ({ onEdit, onClone, onExport, onDelete, disableActions, onIsEnabledChange, }: UseTemplatesColumnsProps) => {
    columns: TemplatesColumns[];
};
export {};
