import type { Filter } from '@kbn/es-query';
import type { ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import type { RawValue } from '../../common/constants';
import type { MapApi } from './types';
export declare function initializeActionHandlers(getApi: () => MapApi | undefined): {
    addFilters: (filters: Filter[], actionId?: string) => Promise<void>;
    getActionContext: () => ActionExecutionContext;
    getFilterActions: () => Promise<import("@kbn/ui-actions-plugin/public").Action<object, object>[]>;
    onSingleValueTrigger: (actionId: string, key: string, value: RawValue) => Promise<void>;
};
