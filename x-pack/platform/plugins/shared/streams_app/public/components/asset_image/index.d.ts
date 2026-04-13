import type { EuiImageProps } from '@elastic/eui';
import React from 'react';
declare const imageSets: {
    welcome: {
        light: () => Promise<typeof import("*.svg")>;
        dark: () => Promise<typeof import("*.svg")>;
        alt: string;
    };
    noResults: {
        light: () => Promise<typeof import("*.svg")>;
        dark: () => Promise<typeof import("*.svg")>;
        alt: string;
    };
    noDocuments: {
        light: () => Promise<typeof import("*.svg")>;
        dark: () => Promise<typeof import("*.svg")>;
        alt: string;
    };
    significantEventsEmptyState: {
        light: () => Promise<typeof import("*.svg")>;
        dark: () => Promise<typeof import("*.svg")>;
        alt: string;
    };
    addStreams: {
        light: () => Promise<typeof import("*.svg")>;
        dark: () => Promise<typeof import("*.svg")>;
        alt: string;
    };
    unableToGeneratePreview: {
        light: () => Promise<typeof import("*.svg")>;
        dark: () => Promise<typeof import("*.svg")>;
        alt: string;
    };
    yourPreviewWillAppearHere: {
        light: () => Promise<typeof import("*.svg")>;
        dark: () => Promise<typeof import("*.svg")>;
        alt: string;
    };
    processorsCannotBeAddedToRootStreams: {
        light: () => Promise<typeof import("*.svg")>;
        dark: () => Promise<typeof import("*.svg")>;
        alt: string;
    };
    extractFields: {
        light: () => Promise<typeof import("*.svg")>;
        dark: () => Promise<typeof import("*.svg")>;
        alt: string;
    };
    barChart: {
        light: () => Promise<typeof import("*.svg")>;
        dark: () => Promise<typeof import("*.svg")>;
        alt: string;
    };
    checklist: {
        light: () => Promise<typeof import("*.svg")>;
        dark: () => Promise<typeof import("*.svg")>;
        alt: string;
    };
    attachmentsEmpty: {
        light: () => Promise<typeof import("*.svg")>;
        dark: () => Promise<typeof import("*.svg")>;
        alt: string;
    };
    suggestPipeline: {
        light: () => Promise<typeof import("*.svg")>;
        dark: () => Promise<typeof import("*.svg")>;
        alt: string;
    };
    routingSuggestionEmptyState: {
        light: () => Promise<typeof import("*.svg")>;
        dark: () => Promise<typeof import("*.svg")>;
        alt: string;
    };
};
interface AssetImageProps extends Omit<EuiImageProps, 'src' | 'url' | 'alt'> {
    type?: keyof typeof imageSets;
}
export declare function AssetImage({ type, ...props }: AssetImageProps): React.JSX.Element | null;
export {};
