import React from 'react';
import type { DataSourceActorRef } from '../state_management/data_source_state_machine';
interface KqlSamplesDataSourceCardProps {
    readonly dataSourceRef: DataSourceActorRef;
}
export declare const KqlSamplesDataSourceCard: ({ dataSourceRef }: KqlSamplesDataSourceCardProps) => React.JSX.Element;
export {};
