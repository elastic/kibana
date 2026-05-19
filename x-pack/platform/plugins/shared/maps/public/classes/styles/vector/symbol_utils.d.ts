import React from 'react';
export declare const CUSTOM_ICON_PIXEL_RATIO: number;
export declare const SYMBOL_OPTIONS: {
    value: string;
    label: string;
    svg: string;
}[];
/**
 * Converts a SVG icon to a PNG image using a signed distance function (SDF).
 *
 * @param {string} svgString - SVG icon as string
 * @param {number} [renderSize=64] - size of the output PNG (higher provides better resolution but requires more processing)
 * @param {number} [cutoff=0.25] - balance between SDF inside 1 and outside 0 of icon
 * @param {number} [radius=0.25] - size of SDF around the cutoff as percent of output icon size
 * @return {ImageData} image that can be added to a MapLibre map with option `{ sdf: true }`
 */
export declare function createSdfIcon({ svg, renderSize, cutoff, radius, }: {
    svg: string;
    renderSize?: number;
    cutoff?: number;
    radius?: number;
}): Promise<ImageData | null>;
export declare function getMakiSymbol(symbolId: string): {
    label: string;
    svg: string;
};
export declare function getMakiSymbolAnchor(symbolId: string): "bottom" | "center";
export declare function getCustomIconId(): string;
export declare function buildSrcUrl(svgString: string): string;
export declare function styleSvg(svgString: string, fill?: string, stroke?: string): Promise<string>;
export declare const PREFERRED_ICONS: string[];
export declare function getIconPaletteOptions(): {
    value: string;
    inputDisplay: React.JSX.Element;
}[];
export declare function getIconPalette(paletteId: string | null): string[];
