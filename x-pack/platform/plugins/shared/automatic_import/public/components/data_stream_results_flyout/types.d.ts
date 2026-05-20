import type { DataStreamResponse } from '../../../common';
export interface DataStreamResultsFlyoutProps {
    integrationId: string;
    integrationName: string;
    dataStream: DataStreamResponse;
    onClose: () => void;
}
export type DataStreamResultsFlyoutComponent = React.ComponentType<DataStreamResultsFlyoutProps>;
