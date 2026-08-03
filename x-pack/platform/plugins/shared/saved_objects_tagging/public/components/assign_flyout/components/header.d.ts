import type { FC } from 'react';
import type { ITagsCache } from '../../../services/tags';
export interface AssignFlyoutHeaderProps {
    tagIds: string[];
    tagCache: ITagsCache;
}
export declare const AssignFlyoutHeader: FC<AssignFlyoutHeaderProps>;
