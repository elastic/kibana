import React from 'react';
import type { UserMessage } from '@kbn/lens-common';
export declare function UserMessages({ blockingErrors, warningOrErrors, infoMessages, canEdit, }: {
    canEdit: boolean;
    blockingErrors: UserMessage[];
    warningOrErrors: UserMessage[];
    infoMessages: UserMessage[];
}): React.JSX.Element | null;
