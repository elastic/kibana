import React from 'react';
import type { Streams } from '@kbn/streams-schema';
export declare function ExportContentPackFlyout({ definition, onExport, onClose, }: {
    definition: Streams.all.GetResponse;
    onClose: () => void;
    onExport: () => void;
}): React.JSX.Element;
