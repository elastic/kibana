import React from 'react';
import type { DataSourceActorRef } from '../state_management/data_source_state_machine';
interface FailureStoreDataSourceCardProps {
    readonly dataSourceRef: DataSourceActorRef;
}
export declare const FailureStoreDataSourceCard: ({ dataSourceRef }: FailureStoreDataSourceCardProps) => React.JSX.Element;
export {};
