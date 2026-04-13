import type { EuiDataGridColumnCellActionProps } from '@elastic/eui';
import type { FlattenRecord } from '@kbn/streams-schema';
import React from 'react';
import type { RoutingDefinitionWithUIAttributes } from '../types';
export type RoutingFilterFn = (routingRule: Partial<RoutingDefinitionWithUIAttributes>) => void;
export declare function buildCellActions(context: FlattenRecord[], onCreate: () => void, onFilter: RoutingFilterFn): ((cellActionProps: EuiDataGridColumnCellActionProps) => React.JSX.Element)[];
