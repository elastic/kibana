import type { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';
import type { RawAction } from '../../../types';
import type { Connector } from '../types';
export declare function connectorFromSavedObject(savedObject: SavedObject<RawAction>, isDeprecated: boolean, isConnectorTypeDeprecated: boolean): Connector;
