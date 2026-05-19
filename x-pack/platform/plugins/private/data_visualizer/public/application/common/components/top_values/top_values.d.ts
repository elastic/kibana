import type { FC } from 'react';
import { type EuiProgressProps } from '@elastic/eui';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import type { FieldVisStats } from '../../../../../common/types';
interface TopValuesProps {
    stats: FieldVisStats | undefined;
    fieldFormat?: any;
    barColor?: EuiProgressProps['color'];
    compressed?: boolean;
    onAddFilter?: (field: DataViewField | string, value: string, type: '+' | '-') => void;
    showSampledValues?: boolean;
}
export declare const TopValues: FC<TopValuesProps>;
export {};
