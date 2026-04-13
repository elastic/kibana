import type { ReactNode } from 'react';
import React from 'react';
import type { QualityIndicators } from '../../../common/types';
export declare function QualityIndicator({ quality, description, dataTestSubj, }: {
    quality: QualityIndicators;
    description: string | ReactNode;
    dataTestSubj?: string;
}): React.JSX.Element;
