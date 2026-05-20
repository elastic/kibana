import { type EuiHealthProps } from '@elastic/eui';
import { type ModelState } from '@kbn/ml-trained-models-utils';
import React from 'react';
export interface NameOverrides {
    downloading?: string;
}
export declare const getModelStateColor: (state: ModelState | undefined, canStartStopTrainedModels: boolean, nameOverrides?: NameOverrides) => {
    color: EuiHealthProps["color"];
    name: string;
    component?: React.ReactNode;
} | null;
