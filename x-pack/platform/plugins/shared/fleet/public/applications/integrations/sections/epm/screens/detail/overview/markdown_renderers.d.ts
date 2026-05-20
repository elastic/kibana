import type { MutableRefObject } from 'react';
import type { Components } from 'react-markdown';
export declare const markdownRenderers: (refs: MutableRefObject<Map<string, HTMLDivElement | null>>, transformImageUri?: (uri: string) => string) => Components;
