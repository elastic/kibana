import React from 'react';
import type { Annotation } from '@kbn/ml-common-types/annotations';
interface Props {
    annotation: Annotation;
    detectorDescription?: string;
}
export declare const AnnotationDescriptionList: ({ annotation, detectorDescription }: Props) => React.JSX.Element;
export {};
