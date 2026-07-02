import type { SavedObject } from '@kbn/core/server';
import type { RawAction, ActionTypeRegistryContract } from '../types';
export declare function transformConnectorsForExport(connectors: SavedObject[], actionTypeRegistry: ActionTypeRegistryContract): Array<SavedObject<RawAction>>;
