import React from 'react';
import type { PaletteOutput, PaletteRegistry } from '@kbn/coloring';
interface PalettePickerProps<T> {
    palettes: PaletteRegistry;
    activePalette?: PaletteOutput<T>;
    setPalette: (palette: PaletteOutput) => void;
}
export declare function PalettePicker<T>({ palettes, activePalette, setPalette }: PalettePickerProps<T>): React.JSX.Element;
export {};
