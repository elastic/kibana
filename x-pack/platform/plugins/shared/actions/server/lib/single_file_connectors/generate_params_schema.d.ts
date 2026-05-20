import type { ConnectorSpec } from '@kbn/connector-specs';
import type { ActionTypeParams, ValidatorType } from '../../types';
export declare const generateParamsSchema: (actions: ConnectorSpec["actions"]) => ValidatorType<ActionTypeParams>;
