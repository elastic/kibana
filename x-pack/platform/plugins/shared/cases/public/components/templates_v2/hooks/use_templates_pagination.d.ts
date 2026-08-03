import type { CriteriaWithPagination, Pagination } from '@elastic/eui';
import type { TemplatesFindRequest, TemplateListItem } from '../../../../common/types/api/template/v1';
export interface UseTemplatesPagination {
    queryParams: TemplatesFindRequest;
    setQueryParams: (params: Partial<TemplatesFindRequest>) => void;
    totalItemCount: number;
}
export type TemplatesPagination = Required<Pick<Pagination, 'pageIndex' | 'pageSize'>> & Pick<Pagination, 'totalItemCount' | 'pageSizeOptions'>;
export declare const useTemplatesPagination: ({ queryParams, setQueryParams, totalItemCount, }: UseTemplatesPagination) => {
    pagination: TemplatesPagination;
    onTableChange: ({ page, sort }: CriteriaWithPagination<TemplateListItem>) => void;
};
