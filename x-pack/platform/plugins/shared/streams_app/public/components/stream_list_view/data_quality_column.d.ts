import React from 'react';
import type { QualityIndicators } from '@kbn/dataset-quality-plugin/common';
export declare function DataQualityColumn({ streamName, quality, isLoading, }: {
    streamName: string;
    quality: QualityIndicators;
    isLoading: boolean;
}): React.JSX.Element;
