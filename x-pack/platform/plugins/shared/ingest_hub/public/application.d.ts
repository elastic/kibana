import React from 'react';
import type { ScopedHistory } from '@kbn/core/public';
import type { IngestFlow } from './types';
interface IngestHubAppProps {
    ingestFlows: IngestFlow[];
    history: ScopedHistory;
}
export declare const IngestHubApp: React.FC<IngestHubAppProps>;
export {};
