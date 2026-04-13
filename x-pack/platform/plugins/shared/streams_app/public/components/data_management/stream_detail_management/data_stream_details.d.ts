import React from 'react';
import type { UnmanagedElasticsearchAssetDetails } from '@kbn/streams-plugin/server/lib/streams/stream_crud';
import type { IndexManagementLocatorParams } from '@kbn/index-management-shared-types';
import type { LocatorPublic } from '@kbn/share-plugin/public';
interface DataStreamDetailsProps {
    dataStream: UnmanagedElasticsearchAssetDetails['dataStream'] | undefined;
    onFlyoutOpen: (name: string) => void;
    indexManagementLocator?: LocatorPublic<IndexManagementLocatorParams>;
}
export declare function DataStreamDetails({ dataStream, onFlyoutOpen, indexManagementLocator, }: DataStreamDetailsProps): React.JSX.Element;
export {};
