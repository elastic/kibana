import { type FC } from 'react';
import type { NotificationsStart } from '@kbn/core/public';
import type { ITagsClient, Tag, TagAttributes } from '../../../common/types';
interface CreateTagModalProps {
    defaultValues?: Partial<TagAttributes>;
    onClose: () => void;
    onSave: (tag: Tag) => void;
    tagClient: ITagsClient;
    notifications: NotificationsStart;
}
export declare const CreateTagModal: FC<CreateTagModalProps>;
export {};
