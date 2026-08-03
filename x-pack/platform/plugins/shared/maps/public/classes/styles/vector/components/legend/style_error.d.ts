import React from 'react';
import type { DynamicStyleProperty } from '../../properties/dynamic_style_property';
interface Props {
    error: Error;
    style: DynamicStyleProperty<object>;
}
export declare const StyleError: ({ error, style }: Props) => React.JSX.Element;
export {};
