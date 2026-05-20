import { type FC } from 'react';
export interface PartitionsSelectorProps {
    splitField: string;
    value: string[];
    onChange: (update: string[]) => void;
    enableSearch?: boolean;
}
export declare const PartitionsSelector: FC<PartitionsSelectorProps>;
