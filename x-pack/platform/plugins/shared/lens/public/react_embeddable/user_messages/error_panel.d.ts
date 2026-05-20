import React from 'react';
import type { UserMessage } from '@kbn/lens-common';
export declare function VisualizationErrorPanel({ errors, canEdit, }: {
    errors: UserMessage[];
    canEdit: boolean;
}): React.JSX.Element | null;
