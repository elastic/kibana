import type { ActionsClientContext } from '../../../../actions_client';
import type { ConnectorType } from '../../types';
import type { ListTypesParams } from './types';
export declare function listTypes(context: ActionsClientContext, options: ListTypesParams): Promise<ConnectorType[]>;
