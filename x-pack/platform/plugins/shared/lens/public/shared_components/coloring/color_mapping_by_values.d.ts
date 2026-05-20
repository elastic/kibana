import type { MutableRefObject } from 'react';
import React from 'react';
import type { PaletteOutput, PaletteRegistry, DataBounds, CustomPaletteParams } from '@kbn/coloring';
interface ColorMappingByValuesProps {
    palette: PaletteOutput<CustomPaletteParams>;
    isInlineEditing?: boolean;
    setPalette: (palette: PaletteOutput<CustomPaletteParams>) => void;
    paletteService: PaletteRegistry;
    panelRef: MutableRefObject<HTMLDivElement | null>;
    dataBounds: DataBounds;
}
export declare function ColorMappingByValues<T>({ palette, isInlineEditing, setPalette, paletteService, panelRef, dataBounds, }: ColorMappingByValuesProps): React.JSX.Element;
export {};
