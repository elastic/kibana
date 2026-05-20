import type { FC } from 'react';
import React from 'react';
export interface PageProps {
    nextStepPath: string;
    extraButtons?: React.ReactNode;
}
export declare const Page: FC<PageProps>;
