import type { MutableRefObject } from 'react';
import React from 'react';
import type { CustomPaletteParams, DataBounds, PaletteOutput, PaletteRegistry } from '@kbn/coloring';
import type { ColumnState, CellDecorationFillConfig } from '@kbn/lens-common';
export declare function getDecimalPlacesFromInputText(value: string): number;
export declare function getAdjustedRangeForInputChange(inputIndex: 0 | 1, nextValues: [string, string]): [number, number] | undefined;
export interface ProgressBarControlsProps {
    column: ColumnState;
    fillStyle: CellDecorationFillConfig;
    dataBounds: DataBounds;
    palette: PaletteOutput<CustomPaletteParams>;
    paletteService: PaletteRegistry;
    panelRef: MutableRefObject<HTMLDivElement | null>;
    appendLabel?: string;
    isInlineEditing?: boolean;
    onUpdate: (newColumn: Partial<ColumnState>) => void;
}
/**
 * Editor controls for the "Progress bar" cell decoration: bar fill style,
 * the single/palette color source, and the value range that drives the bar domain.
 */
export declare function ProgressBarControls({ column, fillStyle, dataBounds, palette, paletteService, panelRef, appendLabel, isInlineEditing, onUpdate, }: ProgressBarControlsProps): React.JSX.Element;
