import type { SavedObjectReference } from '@kbn/core/server';
import type { SavedObjectAttributesWithReferences } from '../../references';
import type { LogViewSavedObjectAttributes } from '../types';
export declare const logIndicesDataViewReferenceName = "log-indices-data-view-0";
export declare const extractLogIndicesSavedObjectReferences: (unextractedAttributes: LogViewSavedObjectAttributes) => SavedObjectAttributesWithReferences<LogViewSavedObjectAttributes>;
export declare const resolveLogIndicesSavedObjectReferences: (attributes: LogViewSavedObjectAttributes, references: SavedObjectReference[]) => LogViewSavedObjectAttributes;
