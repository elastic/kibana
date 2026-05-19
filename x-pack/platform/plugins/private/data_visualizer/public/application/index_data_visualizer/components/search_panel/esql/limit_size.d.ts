import React from 'react';
import type { ESQLDefaultLimitSizeOption } from '../../../embeddables/grid_embeddable/types';
export declare const ESQLDefaultLimitSizeSelect: ({ limitSize, onChangeLimitSize, }: {
    limitSize: string;
    onChangeLimitSize: (newLimit: ESQLDefaultLimitSizeOption) => void;
}) => React.JSX.Element;
