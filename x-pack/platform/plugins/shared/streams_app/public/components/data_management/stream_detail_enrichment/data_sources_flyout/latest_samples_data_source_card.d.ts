import React from 'react';
import type { DataSourceActorRef } from '../state_management/data_source_state_machine';
interface LatestSamplesDataSourceCardProps {
    readonly dataSourceRef: DataSourceActorRef;
}
export declare const LatestSamplesDataSourceCard: ({ dataSourceRef, }: LatestSamplesDataSourceCardProps) => React.JSX.Element;
export {};
