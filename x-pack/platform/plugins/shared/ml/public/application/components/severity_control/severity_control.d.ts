import type { FC } from 'react';
export interface SeveritySelectorProps {
    value: number | undefined;
    onChange: (value: number) => void;
    disabled?: boolean;
}
export declare const SeverityControl: FC<SeveritySelectorProps>;
