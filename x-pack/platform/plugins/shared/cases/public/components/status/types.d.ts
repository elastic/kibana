import type { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import type { CaseStatuses } from '../../../common/types/domain';
export type Statuses = Record<CaseStatuses, {
    color: string;
    label: string;
    icon: EuiIconType;
    actions: {
        single: {
            title: string;
            description?: string;
        };
    };
    actionBar: {
        title: string;
    };
    button: {
        label: string;
    };
    stats: {
        title: string;
    };
}>;
