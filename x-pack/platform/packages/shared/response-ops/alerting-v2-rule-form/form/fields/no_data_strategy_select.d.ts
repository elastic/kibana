import React from 'react';
import type { NoDataStrategy } from '@kbn/alerting-v2-schemas';
interface NoDataStrategySelectProps {
    value: NoDataStrategy;
    onChange: (strategy: NoDataStrategy) => void;
    disabled?: boolean;
    compressed?: boolean;
    'data-test-subj'?: string;
}
export declare const NoDataStrategySelect: ({ value, onChange, disabled, compressed, "data-test-subj": dataTestSubj, }: NoDataStrategySelectProps) => React.JSX.Element;
export {};
