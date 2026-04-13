import React from 'react';
import type { WiredStreamsStatus } from '@kbn/streams-plugin/public';
interface WiredStreamsToggleProps {
    streamsStatus: WiredStreamsStatus | undefined;
    loading: boolean;
    disabled: boolean;
    onChange: () => void;
}
export declare function WiredStreamsToggle({ streamsStatus, loading, disabled, onChange, }: WiredStreamsToggleProps): React.JSX.Element;
export {};
