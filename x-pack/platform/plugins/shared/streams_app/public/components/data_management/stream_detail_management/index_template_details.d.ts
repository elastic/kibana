import React from 'react';
import type { UnmanagedElasticsearchAssetDetails } from '@kbn/streams-plugin/server/lib/streams/stream_crud';
interface IndexTemplateDetailsProps {
    indexTemplate: UnmanagedElasticsearchAssetDetails['indexTemplate'] | undefined;
    onFlyoutOpen: (name: string) => void;
}
export declare function IndexTemplateDetails({ indexTemplate, onFlyoutOpen }: IndexTemplateDetailsProps): React.JSX.Element;
export {};
