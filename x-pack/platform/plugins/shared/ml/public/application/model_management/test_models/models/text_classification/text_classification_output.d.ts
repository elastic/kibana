import React, { type FC } from 'react';
import type { TextClassificationInference, ZeroShotClassificationInference, FillMaskInference, LangIdentInference, FormattedTextClassificationResponse } from '.';
export declare const getTextClassificationOutputComponent: (inferrer: TextClassificationInference | ZeroShotClassificationInference | FillMaskInference | LangIdentInference) => React.JSX.Element;
export declare const TextClassificationOutput: FC<{
    inferrer: TextClassificationInference | ZeroShotClassificationInference | FillMaskInference | LangIdentInference;
}>;
export declare const PredictionProbabilityList: FC<{
    response: FormattedTextClassificationResponse;
    inputText?: string;
}>;
