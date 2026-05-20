import React from 'react';
import type { NerInference } from './ner_inference';
export declare const getNerOutputComponent: (inferrer: NerInference) => React.JSX.Element;
export declare function getClassIcon(className: string): string;
export declare function getClassLabel(className: string): string;
export declare function getClassColor(className: string, border?: boolean): string;
