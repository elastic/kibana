import type { FC } from 'react';
import React from 'react';
import type { EuiCardProps } from '@elastic/eui';
export declare const useOverviewPageCustomCss: () => import("@emotion/react").SerializedStyles;
export declare const overviewPanelDefaultState: Readonly<{
    nodes: true;
    adJobs: true;
    dfaJobs: true;
}>;
export declare const MLOverviewCard: ({ layout, path, title, titleSize, description, iconType, buttonLabel, cardDataTestSubj, buttonDataTestSubj, }: {
    path: string;
    iconType: string;
    buttonLabel: string;
    cardDataTestSubj: string;
    buttonDataTestSubj: string;
} & EuiCardProps) => React.JSX.Element;
export declare const OverviewPage: FC;
export default OverviewPage;
