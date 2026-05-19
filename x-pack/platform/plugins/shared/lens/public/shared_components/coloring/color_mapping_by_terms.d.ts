import type { MutableRefObject } from 'react';
import React from 'react';
import type { ColorMapping, PaletteOutput, PaletteRegistry, CustomPaletteParams } from '@kbn/coloring';
import type { KbnPalettes } from '@kbn/palettes';
import type { IFieldFormat } from '@kbn/field-formats-plugin/common';
import type { SerializedValue } from '@kbn/data-plugin/common';
interface ColorMappingByTermsProps {
    isDarkMode: boolean;
    colorMapping?: ColorMapping.Config;
    palette?: PaletteOutput<CustomPaletteParams>;
    palettes: KbnPalettes;
    isInlineEditing?: boolean;
    onModeChange?: (isLegacy: boolean) => void;
    setPalette: (palette: PaletteOutput) => void;
    setColorMapping: (colorMapping?: ColorMapping.Config) => void;
    paletteService: PaletteRegistry;
    panelRef: MutableRefObject<HTMLDivElement | null>;
    categories: SerializedValue[];
    formatter?: IFieldFormat;
    allowCustomMatch?: boolean;
}
export declare function ColorMappingByTerms({ isDarkMode, colorMapping, palette, palettes, isInlineEditing, onModeChange, setPalette, setColorMapping, paletteService, panelRef, categories, formatter, allowCustomMatch, }: ColorMappingByTermsProps): React.JSX.Element;
export {};
