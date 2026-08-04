import type { FC } from 'react';
import type { DataViewField } from '@kbn/data-views-plugin/public';
interface Props {
    eventRateLength: number;
    fields?: DataViewField[];
    categoriesLength: number | null;
    loading: boolean;
}
export declare const InformationText: FC<Props>;
export {};
