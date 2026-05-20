import React from 'react';
export declare const ActiveHighlightMarker: import("@emotion/styled").StyledComponent<{
    theme?: import("@emotion/react").Theme;
    as?: React.ElementType;
}, React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>, {}>;
export declare const HighlightMarker: import("@emotion/styled").StyledComponent<{
    theme?: import("@emotion/react").Theme;
    as?: React.ElementType;
}, React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>, {}>;
export declare const highlightFieldValue: (value: string, highlightTerms: string[], HighlightComponent: React.ComponentType<React.PropsWithChildren<{}>>) => React.ReactNode[];
