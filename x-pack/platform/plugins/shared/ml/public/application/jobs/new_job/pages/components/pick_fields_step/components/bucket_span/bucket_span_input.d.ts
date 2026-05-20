import type { FC } from 'react';
interface Props {
    bucketSpan: string;
    setBucketSpan: (bs: string) => void;
    isInvalid: boolean;
    disabled: boolean;
    titleId: string;
    errorId: string;
}
export declare const BucketSpanInput: FC<Props>;
export {};
