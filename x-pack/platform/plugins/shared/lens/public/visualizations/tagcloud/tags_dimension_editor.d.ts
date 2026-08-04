import type { MutableRefObject } from 'react';
import React from 'react';
import type { PaletteRegistry } from '@kbn/coloring';
import type { KbnPalettes } from '@kbn/palettes';
import type { FormatFactory } from '@kbn/visualization-ui-components';
import type { FramePublicAPI } from '@kbn/lens-common';
import type { TagcloudState } from './types';
interface Props {
    paletteService: PaletteRegistry;
    palettes: KbnPalettes;
    state: TagcloudState;
    setState: (state: TagcloudState) => void;
    frame: FramePublicAPI;
    panelRef: MutableRefObject<HTMLDivElement | null>;
    isDarkMode: boolean;
    isInlineEditing?: boolean;
    formatFactory: FormatFactory;
}
export declare function TagsDimensionEditor({ state, frame, setState, panelRef, isDarkMode, palettes, paletteService, isInlineEditing, formatFactory, }: Props): React.JSX.Element;
export {};
