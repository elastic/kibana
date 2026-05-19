import type { SavedObject, SavedObjectsFindResponse, SavedObjectsUpdateResponse } from '@kbn/core/server';
import type { estypes } from '@elastic/elasticsearch';
import type { Case } from '../../../common/types/domain';
import { ConnectorReferenceHandler } from '../connector_reference_handler';
import type { CasePersistedAttributes, CaseTransformedAttributes, CaseTransformedAttributesWithAttachmentStats } from '../../common/types/case';
export declare function transformUpdateResponseToExternalModel(updatedCase: SavedObjectsUpdateResponse<CasePersistedAttributes>): SavedObjectsUpdateResponse<CaseTransformedAttributes>;
export declare function transformAttributesToESModel(caseAttributes: CaseTransformedAttributes): {
    attributes: CasePersistedAttributes;
    referenceHandler: ConnectorReferenceHandler;
};
export declare function transformAttributesToESModel(caseAttributes: Partial<CaseTransformedAttributesWithAttachmentStats>): {
    attributes: Partial<CasePersistedAttributes>;
    referenceHandler: ConnectorReferenceHandler;
};
export declare function transformESModelToCase(caseId: string, caseData: CasePersistedAttributes, hit: estypes.SearchHit): Case;
export declare function transformFindResponseToExternalModel(response: SavedObjectsFindResponse<CasePersistedAttributes>): SavedObjectsFindResponse<CaseTransformedAttributes>;
export declare function transformSavedObjectToExternalModel(caseSavedObject: SavedObject<CasePersistedAttributes>): SavedObject<CaseTransformedAttributes>;
