import React from 'react';
import { type ArrayItem } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { TimeUnit } from '../types';
export interface AfterFieldProps {
    item: ArrayItem;
    dataTestSubj: string;
    timeUnitOptions: ReadonlyArray<{
        value: TimeUnit;
        text: string;
    }>;
    dataRetentionMs?: number;
    dataRetentionEsFormat?: string;
}
export declare const AfterField: ({ item, dataTestSubj, timeUnitOptions, dataRetentionMs, dataRetentionEsFormat, }: AfterFieldProps) => React.JSX.Element;
