import type { PropsWithChildren } from 'react';
import React from 'react';
import type { DataSourceActorRef } from '../state_management/data_source_state_machine';
interface DataSourceCardProps {
    readonly dataSourceRef: DataSourceActorRef;
    readonly title?: string;
    readonly subtitle?: string;
    readonly isPreviewVisible?: boolean;
    readonly isForCompleteSimulation?: boolean;
    readonly 'data-test-subj'?: string;
}
export declare const DataSourceCard: ({ children, dataSourceRef, title, subtitle, isPreviewVisible, isForCompleteSimulation, "data-test-subj": dataTestSubj, }: PropsWithChildren<DataSourceCardProps>) => React.JSX.Element;
export declare const PartialSimulationBadge: ({ short }: {
    short?: boolean;
}) => React.JSX.Element;
export declare const CompleteSimulationBadge: ({ short }: {
    short?: boolean;
}) => React.JSX.Element;
export {};
