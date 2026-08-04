import type { UserConfiguredActionConnector } from '@kbn/alerts-ui-shared/src/common/types/action_types';
import type { ActionConnector } from '../../types';
type CreateConnectorSchema = Pick<UserConfiguredActionConnector<Record<string, unknown>, Record<string, unknown>>, 'actionTypeId' | 'name' | 'config' | 'secrets' | 'id'>;
export interface CreateConnectorError {
    title: string;
    message: string;
}
interface UseCreateConnectorReturnValue {
    isLoading: boolean;
    createConnectorError: CreateConnectorError | null;
    createConnector: (connector: CreateConnectorSchema) => Promise<ActionConnector | undefined>;
}
export declare const useCreateConnector: () => UseCreateConnectorReturnValue;
export {};
