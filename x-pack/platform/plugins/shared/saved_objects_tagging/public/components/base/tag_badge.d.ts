import { type ReactElement } from 'react';
import type { TagAttributes } from '../../../common/types';
export interface TagBadgeProps<T> {
    tag: T;
    onClick?: (tag: T) => void;
}
/**
 * The badge representation of a Tag, which is the default display to be used for them.
 */
export declare const TagBadge: <T extends TagAttributes>(props: TagBadgeProps<T>) => ReactElement;
