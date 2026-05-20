import type { FC, PropsWithChildren } from 'react';
export interface ListItems {
    title: string;
    description: string | JSX.Element;
}
export declare const trueLabel: string;
export declare const falseLabel: string;
export declare const defaultLabel: string;
export declare const JobSectionTitle: FC;
export declare const DatafeedSectionTitle: FC;
export declare const Italic: FC<PropsWithChildren<unknown>>;
