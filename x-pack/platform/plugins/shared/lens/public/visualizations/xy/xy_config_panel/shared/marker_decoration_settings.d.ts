import React from 'react';
import type { IconPosition } from '@kbn/expression-xy-plugin/common';
import type { YAxisMode } from '../../types';
export declare function hasIcon(icon: string | undefined): icon is string;
export interface MarkerDecorationConfig<T extends string = string> {
    axisMode?: YAxisMode;
    icon?: T;
    iconPosition?: IconPosition;
    textVisibility?: boolean;
    textField?: string;
}
export declare function MarkerDecorationPosition<Icon extends string = string>({ currentConfig, setConfig, isHorizontal, }: {
    currentConfig?: MarkerDecorationConfig<Icon>;
    setConfig: (config: MarkerDecorationConfig<Icon>) => void;
    isHorizontal: boolean;
}): React.JSX.Element;
