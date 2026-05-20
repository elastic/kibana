import type { FC } from 'react';
interface Props {
    isActive: boolean;
    onEditJob: (i: number) => void;
    onDeleteJob: (i: number) => void;
}
export declare const DetectorList: FC<Props>;
export {};
