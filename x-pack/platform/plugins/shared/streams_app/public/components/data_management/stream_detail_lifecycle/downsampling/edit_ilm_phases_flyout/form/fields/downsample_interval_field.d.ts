import React from 'react';
import type { PhaseName } from '@kbn/streams-schema';
import type { TimeUnit } from '../types';
export interface DownsampleIntervalFieldProps {
    phaseName: PhaseName;
    dataTestSubj: string;
    timeUnitOptions: ReadonlyArray<{
        value: TimeUnit;
        text: string;
    }>;
    isEnabled: boolean;
}
export declare const DownsampleIntervalField: ({ phaseName, dataTestSubj, timeUnitOptions, isEnabled, }: DownsampleIntervalFieldProps) => React.JSX.Element;
