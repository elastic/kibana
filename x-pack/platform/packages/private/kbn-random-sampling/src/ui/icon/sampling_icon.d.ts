import React from 'react';
interface CustomProps {
    title?: string;
    titleId?: string;
}
export type RandomSamplingIconProps = React.SVGProps<SVGSVGElement> & CustomProps;
export declare function RandomSamplingIcon({ title, titleId, ...props }: RandomSamplingIconProps): React.JSX.Element;
export {};
