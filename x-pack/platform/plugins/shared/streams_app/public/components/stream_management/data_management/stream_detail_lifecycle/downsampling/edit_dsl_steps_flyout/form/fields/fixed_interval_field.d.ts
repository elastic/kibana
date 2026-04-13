import React from 'react';
import { type ArrayItem } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { TimeUnit } from '../types';
export interface FixedIntervalFieldProps {
    item: ArrayItem;
    dataTestSubj: string;
    timeUnitOptions: ReadonlyArray<{
        value: TimeUnit;
        text: string;
    }>;
}
export declare const FixedIntervalField: ({ item, dataTestSubj, timeUnitOptions, }: FixedIntervalFieldProps) => React.JSX.Element;
