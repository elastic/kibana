import React from 'react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { HttpStart } from '@kbn/core-http-browser';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { QueryClient } from '@kbn/react-query';
interface TagsFlyoutInnerProps {
    currentTags: string[];
    http: HttpStart;
    services: {
        expressions: ExpressionsStart;
        spaces: SpacesPluginStart;
    };
    onConfirm: (tags: string[]) => void;
    onCancel: () => void;
}
export declare const TagsFlyoutInner: ({ currentTags, http, services, onConfirm, onCancel, }: TagsFlyoutInnerProps) => React.JSX.Element;
export declare const openTagsFlyout: (overlays: OverlayStart, rendering: CoreStart["rendering"], currentTags: string[], deps: {
    http: HttpStart;
    expressions: ExpressionsStart;
    spaces: SpacesPluginStart;
    queryClient: QueryClient;
}) => Promise<string[] | undefined>;
export {};
