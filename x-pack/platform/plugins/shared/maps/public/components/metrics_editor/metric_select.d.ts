import React from 'react';
import type { EuiComboBoxOptionOption, EuiComboBoxProps } from '@elastic/eui';
import { AGG_TYPE } from '../../../common/constants';
type Props = Omit<EuiComboBoxProps<AGG_TYPE>, 'onChange'> & {
    value: AGG_TYPE;
    onChange: (aggType: AGG_TYPE) => void;
    metricsFilter?: (metricOption: EuiComboBoxOptionOption<AGG_TYPE>) => boolean;
};
export declare function MetricSelect({ value, onChange, metricsFilter, ...rest }: Props): React.JSX.Element;
export {};
