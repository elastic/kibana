import React from 'react';
import type { LogCategory } from '../../types';
interface ControlColumnsProps {
    expandedRowIndex: number | null;
    onOpenFlyout: (category: LogCategory, rowIndex: number) => void;
    onCloseFlyout: () => void;
}
export declare const createLogCategoriesGridControlColumns: (props: ControlColumnsProps) => {
    id: string;
    width: number;
    headerCellRender: () => React.JSX.Element;
    rowCellRender: import("@elastic/eui").RenderCellValue;
}[];
export {};
