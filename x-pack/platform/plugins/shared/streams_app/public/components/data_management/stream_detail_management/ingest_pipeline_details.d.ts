import React from 'react';
import type { UnmanagedElasticsearchAssetDetails } from '@kbn/streams-plugin/server/lib/streams/stream_crud';
interface IngestPipelineDetailsProps {
    ingestPipeline: UnmanagedElasticsearchAssetDetails['ingestPipeline'] | undefined;
    onFlyoutOpen: (name: string) => void;
}
export declare function IngestPipelineDetails({ ingestPipeline, onFlyoutOpen, }: IngestPipelineDetailsProps): React.JSX.Element;
export {};
