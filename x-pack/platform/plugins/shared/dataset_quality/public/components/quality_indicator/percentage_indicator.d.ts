import React from 'react';
export declare function QualityPercentageIndicator({ percentage, docsCount, fewDocsTooltipContent, }: {
    percentage: number;
    docsCount?: number;
    fewDocsTooltipContent: (docsCount: number) => string;
}): React.JSX.Element;
