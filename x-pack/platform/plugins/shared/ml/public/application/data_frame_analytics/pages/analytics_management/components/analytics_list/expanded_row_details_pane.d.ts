import type { FC, ReactElement } from 'react';
import React from 'react';
export interface SectionItem {
    title: string;
    type?: 'plain' | 'badge';
    description: string | ReactElement;
}
export interface SectionConfig {
    title: string;
    items: SectionItem[];
    dataTestSubj: string;
}
interface SectionProps {
    section: SectionConfig;
}
export declare const OverallDetails: FC<{
    overallDetails: SectionConfig;
}>;
export declare const Stats: ({ section }: {
    section: SectionConfig;
}) => React.JSX.Element;
export declare const Section: FC<SectionProps>;
interface ExpandedRowDetailsPaneProps {
    overallDetails: SectionConfig;
    dataCounts: SectionConfig;
    memoryUsage: SectionConfig;
    analysisStats?: SectionConfig;
    progress: SectionConfig;
    dataTestSubj: string;
}
export declare const ExpandedRowDetailsPane: FC<ExpandedRowDetailsPaneProps>;
export {};
