import type { ConnectorCreateParams } from './types';
import type { ActionResult } from '../../../../types';
export declare function create({ context, action: { actionTypeId, name, config, secrets }, options, }: ConnectorCreateParams): Promise<ActionResult>;
