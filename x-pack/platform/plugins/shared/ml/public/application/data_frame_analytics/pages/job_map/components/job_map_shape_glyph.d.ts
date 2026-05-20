import React from 'react';
/** Width and height of the SVG `viewBox` (and rendered size in px). */
export declare const GLYPH_VIEW_BOX_SIZE = 52;
export interface JobMapShapeGlyphProps {
    nodeType: string;
    label: string;
    fill: string;
    stroke: string;
    strokeWidth: number;
    iconSrc?: string;
}
export declare const JobMapShapeGlyph: React.MemoExoticComponent<({ nodeType, label, fill, stroke, strokeWidth, iconSrc }: JobMapShapeGlyphProps) => React.JSX.Element>;
