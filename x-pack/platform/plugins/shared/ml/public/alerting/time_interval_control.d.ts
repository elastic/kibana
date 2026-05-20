import type { FC, ReactNode } from 'react';
import type { EuiFieldTextProps } from '@elastic/eui';
type TimeIntervalControlProps = Omit<EuiFieldTextProps, 'value' | 'onChange'> & {
    label: string | ReactNode;
    value: string | null | undefined;
    onChange: (update: string) => void;
};
export declare const TimeIntervalControl: FC<TimeIntervalControlProps>;
export {};
