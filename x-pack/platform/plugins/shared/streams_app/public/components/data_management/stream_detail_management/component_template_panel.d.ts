import React from 'react';
import type { UnmanagedElasticsearchAssetDetails } from '@kbn/streams-plugin/server/lib/streams/stream_crud';
export declare function ComponentTemplatePanel({ componentTemplates, onFlyoutOpen, }: {
    componentTemplates: UnmanagedElasticsearchAssetDetails['componentTemplates'] | undefined;
    onFlyoutOpen: (name: string) => void;
}): React.JSX.Element;
