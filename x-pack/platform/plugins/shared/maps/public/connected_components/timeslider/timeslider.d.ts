import React from 'react';
import type { Observable } from 'rxjs';
import type { TimeRange } from '@kbn/es-query';
import type { Timeslice } from '../../../common/descriptor_types';
export interface Props {
    setTimeslice: (timeslice?: Timeslice) => void;
    timeRange: TimeRange;
    waitForTimesliceToLoad$: Observable<void>;
}
export declare function Timeslider({ setTimeslice, timeRange, waitForTimesliceToLoad$ }: Props): React.JSX.Element;
