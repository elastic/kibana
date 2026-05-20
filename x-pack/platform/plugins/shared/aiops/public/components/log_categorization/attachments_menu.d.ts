import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { RandomSamplerOption, RandomSamplerProbability } from '@kbn/ml-random-sampler-utils';
interface AttachmentsMenuProps {
    randomSamplerMode: RandomSamplerOption;
    randomSamplerProbability: RandomSamplerProbability;
    dataView: DataView;
    selectedField?: string;
}
export declare const AttachmentsMenu: ({ randomSamplerMode, randomSamplerProbability, dataView, selectedField, }: AttachmentsMenuProps) => React.JSX.Element;
export {};
