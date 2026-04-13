import React from 'react';
import type { WiredStreamsStatus } from '@kbn/streams-plugin/public';
interface LegacyLogsDeprecationCalloutProps {
    streamsStatus: WiredStreamsStatus | undefined;
    openFlyout: () => void;
}
export declare function LegacyLogsDeprecationCallout({ streamsStatus, openFlyout, }: LegacyLogsDeprecationCalloutProps): React.JSX.Element | null;
export {};
