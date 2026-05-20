import type { FC } from 'react';
import React from 'react';
interface Props {
    id: string;
    label: string;
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}
export declare const TimeseriesExplorerCheckbox: FC<Props>;
export {};
