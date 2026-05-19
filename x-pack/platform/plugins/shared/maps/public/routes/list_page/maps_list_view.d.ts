import React from 'react';
import type { ScopedHistory } from '@kbn/core/public';
interface Props {
    history: ScopedHistory;
}
declare function MapsListViewComp({ history }: Props): React.JSX.Element;
export declare const MapsListView: React.MemoExoticComponent<typeof MapsListViewComp>;
export {};
