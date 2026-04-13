import React from 'react';
import type { QualityIndicators } from '../../../common/types';
export declare const DatasetQualityIndicator: ({ isLoading, quality, verbose, showTooltip, dataTestSubj, }: {
    isLoading: boolean;
    quality: QualityIndicators;
    verbose?: boolean;
    showTooltip?: boolean;
    dataTestSubj?: string;
}) => React.JSX.Element;
