import type { FC } from 'react';
interface Props {
    isDisabled: boolean;
    onClick: () => void;
    mode: 'full' | 'empty';
}
export declare const ForecastButton: FC<Props>;
export {};
