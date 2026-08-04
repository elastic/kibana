import React from 'react';
import type { DataContextType, DatatableRenderProps } from './types';
export declare const DataContext: React.Context<DataContextType>;
export declare const DEFAULT_PAGE_SIZE = 10;
export declare const DatatableComponent: (props: DatatableRenderProps) => React.JSX.Element;
