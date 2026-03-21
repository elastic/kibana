import type { SavedObject, SavedObjectsImportWarning } from '@kbn/core/server';
import type { RawAction } from '../types';
export declare function getImportWarnings(connectors: Array<SavedObject<RawAction>>): SavedObjectsImportWarning[];
export declare const GO_TO_CONNECTORS_BUTTON_LABLE: string;
