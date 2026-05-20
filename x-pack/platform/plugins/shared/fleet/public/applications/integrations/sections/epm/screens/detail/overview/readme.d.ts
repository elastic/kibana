import React from 'react';
import type { MutableRefObject } from 'react';
export declare function Readme({ packageName, version, markdown, refs, }: {
    packageName: string;
    version: string;
    markdown: string | undefined;
    refs: MutableRefObject<Map<string, HTMLDivElement | null>>;
}): React.JSX.Element;
