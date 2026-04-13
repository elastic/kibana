import React from 'react';
import type { WiredStreamsStatus } from '@kbn/streams-plugin/public';
export declare function StreamsSettingsFlyout({ onClose, refreshStreams, streamsStatus, onRefreshStatus, }: {
    onClose: () => void;
    refreshStreams: () => void;
    streamsStatus: WiredStreamsStatus | undefined;
    onRefreshStatus: () => Promise<void>;
}): React.JSX.Element;
