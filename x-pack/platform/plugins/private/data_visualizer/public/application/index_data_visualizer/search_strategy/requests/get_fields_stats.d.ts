import type { Observable } from 'rxjs';
import type { ISearchOptions } from '@kbn/search-types';
import type { ISearchStart } from '@kbn/data-plugin/public';
import type { FieldStatsCommonRequestParams, SupportedAggs } from '../../../../../common/types/field_stats';
import type { FieldStatsError } from '../../../../../common/types/field_stats';
import type { FieldStats } from '../../../../../common/types/field_stats';
export declare const getFieldsStats: (dataSearch: ISearchStart, params: FieldStatsCommonRequestParams, fields: Array<{
    fieldName: string;
    type: string;
    cardinality: number;
    safeFieldName: string;
    supportedAggs?: SupportedAggs;
}>, options: ISearchOptions) => Observable<FieldStats[] | FieldStatsError> | undefined;
