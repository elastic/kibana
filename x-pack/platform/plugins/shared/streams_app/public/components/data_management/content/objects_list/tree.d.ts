import React from 'react';
import type { ContentPackStream } from '@kbn/content-packs-schema';
export declare function StreamTree({ streams, onSelectionChange, }: {
    streams: ContentPackStream[];
    onSelectionChange: (selection: Record<string, {
        selected: boolean;
    }>) => void;
}): React.JSX.Element;
