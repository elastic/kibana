import React from 'react';
import type { DataSourceActorRef } from '../state_management/data_source_state_machine';
interface DataSourceProps {
    readonly dataSourceRef: DataSourceActorRef;
}
export declare const DataSource: ({ dataSourceRef }: DataSourceProps) => React.JSX.Element | null;
export {};
