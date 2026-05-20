import { type FC } from 'react';
import type { EuiComboBoxProps } from '@elastic/eui';
import type { Tag } from '../../../common/types';
import type { CreateModalOpener } from '../edition_modal';
interface CreateOption {
    type: '__create_option__';
}
export type TagSelectorProps = EuiComboBoxProps<Tag | CreateOption> & {
    tags: Tag[];
    selected: string[];
    onTagsSelected: (ids: string[]) => void;
    'data-test-subj'?: string;
    allowCreate: boolean;
    openCreateModal: CreateModalOpener;
};
export declare const TagSelector: FC<TagSelectorProps>;
export {};
