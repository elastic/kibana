import React from 'react';
import type { IngestFlow } from '../types';
interface IngestFlowFlyoutProps {
    flow: IngestFlow;
    onClose: () => void;
}
export declare const IngestFlowFlyout: React.FC<IngestFlowFlyoutProps>;
export {};
