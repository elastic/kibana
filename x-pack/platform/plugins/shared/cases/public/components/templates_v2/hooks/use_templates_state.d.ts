import type { EuiBasicTableProps, EuiTableSelectionType } from '@elastic/eui';
import type { TemplatesFindRequest, TemplateListItem } from '../../../../common/types/api/template/v1';
interface UseTemplatesStateReturn {
    queryParams: TemplatesFindRequest;
    setQueryParams: (queryParam: Partial<TemplatesFindRequest>) => void;
    sorting: EuiBasicTableProps<TemplateListItem>['sorting'];
    selectedTemplates: TemplateListItem[];
    selection: EuiTableSelectionType<TemplateListItem>;
    deselectTemplates: () => void;
}
export declare const useTemplatesState: () => UseTemplatesStateReturn;
export {};
