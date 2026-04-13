import React from 'react';
import type { PhaseName } from '@kbn/streams-schema';
import type { TimeUnit } from '../types';
export interface MinAgeFieldProps {
    phaseName: PhaseName | undefined;
    dataTestSubj: string;
    timeUnitOptions: ReadonlyArray<{
        value: TimeUnit;
        text: string;
    }>;
}
export declare const MinAgeField: ({ phaseName, dataTestSubj, timeUnitOptions }: MinAgeFieldProps) => React.JSX.Element | null;
