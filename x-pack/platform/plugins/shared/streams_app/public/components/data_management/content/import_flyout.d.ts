import React from 'react';
import type { Streams } from '@kbn/streams-schema';
export declare function ImportContentPackFlyout({ definition, onImport, onClose, }: {
    definition: Streams.all.GetResponse;
    onClose: () => void;
    onImport: () => void;
}): React.JSX.Element;
