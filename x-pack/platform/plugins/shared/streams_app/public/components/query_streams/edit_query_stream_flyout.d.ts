import React from 'react';
import type { Streams } from '@kbn/streams-schema';
interface EditQueryStreamFlyoutProps {
    definition: Streams.QueryStream.GetResponse;
    onClose: () => void;
    onSave: () => void;
}
export declare function EditQueryStreamFlyout({ definition, onClose, onSave }: EditQueryStreamFlyoutProps): React.JSX.Element;
export {};
