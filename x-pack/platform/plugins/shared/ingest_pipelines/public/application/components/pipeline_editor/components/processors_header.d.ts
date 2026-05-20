import type { FunctionComponent } from 'react';
import type { OnDoneLoadJsonHandler } from '.';
export interface Props {
    onLoadJson: OnDoneLoadJsonHandler;
    hasProcessors: boolean;
}
export declare const ProcessorsHeader: FunctionComponent<Props>;
