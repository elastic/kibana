import React from 'react';
import type { EuiBadgeGroupProps } from '@elastic/eui';
interface TagsProps {
    tags: string[];
    color?: string;
    gutterSize?: EuiBadgeGroupProps['gutterSize'];
}
export declare const Tags: React.NamedExoticComponent<TagsProps>;
export {};
