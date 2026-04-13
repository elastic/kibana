import React from 'react';
import type { DataSourceActorRef } from '../state_management/data_source_state_machine';
interface CustomSamplesDataSourceCardProps {
    readonly dataSourceRef: DataSourceActorRef;
}
export declare const CustomSamplesDataSourceCard: ({ dataSourceRef, }: CustomSamplesDataSourceCardProps) => React.JSX.Element;
export {};
