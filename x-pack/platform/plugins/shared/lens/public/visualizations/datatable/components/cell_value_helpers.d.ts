import React, { type ReactNode } from 'react';
import type { PaletteOutput } from '@kbn/coloring';
import type { CustomPaletteState } from '@kbn/charts-plugin/common';
import type { RawValue } from '@kbn/data-plugin/common';
import type { DatatableColumnConfig } from '../../../../common/expressions';
import type { CellColorFn } from '../../../shared_components/coloring/get_cell_color_fn';
export type RenderMode = 'badge' | 'link' | 'formatted';
export type Alignment = 'left' | 'right' | 'center' | undefined;
export type ColumnConfigWithIndex = DatatableColumnConfig['columns'][number] & {
    colIndex: number;
};
export declare const getBadgeLabel: (value: unknown) => string;
export declare const buildColumnConfigLookup: (columns: DatatableColumnConfig["columns"]) => Map<string, ColumnConfigWithIndex>;
export declare const getCellClassName: (alignment: Alignment, fitRowToContent?: boolean, isColored?: boolean) => string;
export declare const getRenderMode: (colorMode: string, isClickable: boolean, isNonColorable: boolean) => RenderMode;
/**
 * Values that are rendered as "empty" placeholders in the table should never receive
 * dynamic coloring (cell/text/badge). They should remain subdued, consistent with
 * the non-colored ("none") mode.
 */
export declare const isNonColorableValue: (rawValue: RawValue) => boolean;
export interface ApplyColoringArgs {
    colorMode: string;
    columnId: string;
    palette?: PaletteOutput<CustomPaletteState>;
    colorMapping?: string;
    rawValue: RawValue;
    getCellColor: (originalId: string, palette?: PaletteOutput<CustomPaletteState>, colorMapping?: string) => CellColorFn;
    isDarkMode: boolean;
}
export declare const applyCellColoring: ({ colorMode, columnId, palette, colorMapping, rawValue, getCellColor, isDarkMode, }: ApplyColoringArgs) => React.CSSProperties | null;
export interface FormattedCellProps {
    content: ReactNode;
    alignment: Alignment;
    fitRowToContent?: boolean;
    isColored: boolean;
}
export declare const FormattedCell: ({ content, alignment, fitRowToContent, isColored, }: FormattedCellProps) => React.JSX.Element;
export interface LinkCellProps {
    content: string;
    linkColor: string;
    onClick: () => void;
    alignment: Alignment;
    fitRowToContent?: boolean;
}
export declare const LinkCell: ({ content, linkColor, onClick, alignment, fitRowToContent, }: LinkCellProps) => React.JSX.Element;
export interface BadgeCellProps {
    label: string;
    badgeColor: string | null;
    isClickable: boolean;
    onClick: () => void;
    isDarkMode: boolean;
    alignment: Alignment;
    fitRowToContent?: boolean;
}
export declare const BadgeCell: ({ label, badgeColor, isClickable, onClick, isDarkMode, alignment, fitRowToContent, }: BadgeCellProps) => React.JSX.Element;
