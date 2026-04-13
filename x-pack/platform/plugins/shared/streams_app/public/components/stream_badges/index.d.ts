import type { IngestStreamEffectiveLifecycle } from '@kbn/streams-schema';
import { Streams } from '@kbn/streams-schema';
import React from 'react';
import type { IndicesIndexMode } from '@elastic/elasticsearch/lib/api/types';
export declare function ClassicStreamBadge(): React.JSX.Element;
export declare function WiredStreamBadge(): React.JSX.Element;
export declare function QueryStreamBadge(): React.JSX.Element;
export declare function DeprecatedLogsBadge({ openFlyout, hasNewStreams, }: {
    openFlyout?: () => void;
    hasNewStreams: boolean;
}): React.JSX.Element;
export declare function LifecycleBadge({ lifecycle, dataTestSubj, }: {
    lifecycle: IngestStreamEffectiveLifecycle;
    dataTestSubj?: string;
}): React.JSX.Element;
export declare function DiscoverBadgeButton({ stream, hasDataStream, spellOut, indexMode, }: {
    stream: Streams.all.Definition;
    hasDataStream?: boolean;
    spellOut?: boolean;
    indexMode?: IndicesIndexMode;
}): React.JSX.Element | null;
export declare function TimeSeriesBadge(): React.JSX.Element;
