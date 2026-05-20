import React from 'react';
import type { DataStreamResponse } from '../../../../../common';
interface EditPipelineFlyoutProps {
    integrationId: string;
    dataStream: DataStreamResponse;
    onClose: () => void;
}
export declare const EditPipelineFlyout: {
    ({ integrationId, dataStream, onClose, }: EditPipelineFlyoutProps): React.JSX.Element;
    displayName: string;
};
export {};
