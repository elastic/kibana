import React from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import type { AggDescriptor } from '../../../common/descriptor_types';
import { AGG_TYPE } from '../../../common/constants';
interface Props {
    bucketsName?: string;
    isJoin: boolean;
    metric: AggDescriptor;
    fields: DataViewField[];
    onChange: (metric: AggDescriptor) => void;
    onRemove: () => void;
    metricsFilter?: (metricOption: EuiComboBoxOptionOption<AGG_TYPE>) => boolean;
    showRemoveButton: boolean;
}
export declare function MetricEditor({ bucketsName, fields, isJoin, metricsFilter, metric, onChange, showRemoveButton, onRemove, }: Props): React.JSX.Element;
export {};
