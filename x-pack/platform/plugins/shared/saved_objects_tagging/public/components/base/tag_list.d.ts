import { type FC } from 'react';
import type { TagWithOptionalId } from '../../../common/types';
export interface TagListProps {
    tags: TagWithOptionalId[];
    onClick?: (tag: TagWithOptionalId) => void;
    tagRender?: (tag: TagWithOptionalId) => JSX.Element;
}
/**
 * Displays a list of tag
 */
export declare const TagList: FC<TagListProps>;
