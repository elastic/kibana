import type { FC, PropsWithChildren, ReactNode } from 'react';
export declare const MlPageHeader: FC<PropsWithChildren<{
    leftSideItems?: ReactNode | ReactNode[];
    rightSideItems?: ReactNode | ReactNode[];
    restrictWidth?: number;
    wrapHeader?: boolean;
}>>;
export declare const MlPageHeaderRenderer: FC;
