import type { ConnectorSpec } from '@kbn/connector-specs';
import type { ActionTypeConfig, ValidatorType } from '../../types';
export declare const generateConfigSchema: (schema: ConnectorSpec["schema"]) => ValidatorType<ActionTypeConfig>;
