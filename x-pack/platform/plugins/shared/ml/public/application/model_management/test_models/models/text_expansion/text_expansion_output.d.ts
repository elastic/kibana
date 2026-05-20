import React, { type FC } from 'react';
import type { TextExpansionInference, FormattedTextExpansionResponse } from '.';
export declare const getTextExpansionOutputComponent: (inferrer: TextExpansionInference) => React.JSX.Element;
export declare const TextExpansionOutput: FC<{
    inferrer: TextExpansionInference;
}>;
export declare const DocumentResult: FC<{
    response: FormattedTextExpansionResponse;
}>;
export declare const DocumentResultWithTokens: FC<{
    response: FormattedTextExpansionResponse;
}>;
