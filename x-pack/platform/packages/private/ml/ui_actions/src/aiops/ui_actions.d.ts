import type { EuiFlyoutProps } from '@elastic/eui';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
export interface CategorizeFieldContext {
    field: DataViewField;
    dataView: DataView;
    originatingApp: string;
    additionalFilter?: {
        from: number;
        to: number;
        field?: {
            name: string;
            value: string;
        };
    };
    focusTrapProps?: EuiFlyoutProps['focusTrapProps'];
}
export declare const ACTION_CATEGORIZE_FIELD = "ACTION_CATEGORIZE_FIELD";
