import type { FC } from 'react';
import React from 'react';
import type { PageProps } from '../../router';
interface IndexOrSearchPageProps extends PageProps {
    nextStepPath: string;
    mode: MODE;
    extraButtons?: React.ReactNode;
}
export declare enum MODE {
    NEW_JOB = 0,
    DATAVISUALIZER = 1
}
export declare const PageWrapper: FC<IndexOrSearchPageProps>;
export {};
