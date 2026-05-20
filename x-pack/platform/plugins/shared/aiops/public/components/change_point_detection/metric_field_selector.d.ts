import { type FC } from 'react';
interface MetricFieldSelectorProps {
    value: string;
    onChange: (value: string) => void;
    inline?: boolean;
}
export declare const MetricFieldSelector: FC<MetricFieldSelectorProps>;
export {};
