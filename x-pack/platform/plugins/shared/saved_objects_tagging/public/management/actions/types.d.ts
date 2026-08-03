import type { Action as EuiTableAction } from '@elastic/eui/src/components/basic_table/action_types';
import type { TagWithRelations } from '../../../common/types';
export type TagAction = EuiTableAction<TagWithRelations> & {
    id: string;
};
