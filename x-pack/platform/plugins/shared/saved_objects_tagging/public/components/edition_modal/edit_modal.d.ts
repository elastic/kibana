import { type FC } from 'react';
import type { NotificationsStart } from '@kbn/core/public';
import type { ITagsClient, Tag } from '../../../common/types';
interface EditTagModalProps {
    tag: Tag;
    onClose: () => void;
    onSave: (tag: Tag) => void;
    tagClient: ITagsClient;
    notifications: NotificationsStart;
}
export declare const EditTagModal: FC<EditTagModalProps>;
export {};
