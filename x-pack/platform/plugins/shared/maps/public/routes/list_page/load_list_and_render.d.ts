import React from 'react';
import type { EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';
import type { ScopedHistory } from '@kbn/core/public';
interface Props {
    history: ScopedHistory;
    stateTransfer: EmbeddableStateTransfer;
}
export declare function LoadListAndRender(props: Props): React.JSX.Element | null;
export {};
