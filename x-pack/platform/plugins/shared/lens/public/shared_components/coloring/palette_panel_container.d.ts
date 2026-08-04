import type { MutableRefObject } from 'react';
import React from 'react';
export declare function PalettePanelContainer(props: {
    palette: string[];
    siblingRef: MutableRefObject<HTMLDivElement | null>;
    children?: React.ReactElement | React.ReactElement[];
    isInlineEditing?: boolean;
    title?: string;
}): React.JSX.Element;
