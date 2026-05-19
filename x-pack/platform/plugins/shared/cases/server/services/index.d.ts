import type { SavedObjectsClientContract } from '@kbn/core/server';
export { CasesService } from './cases';
export { CaseConfigureService } from './configure';
export { CaseUserActionService } from './user_actions';
export { ConnectorMappingsService } from './connector_mappings';
export { AlertService } from './alerts';
export { AttachmentService } from './attachments';
export { UserProfileService } from './user_profiles';
export { TemplatesService } from './templates';
export { FieldDefinitionsService } from './field_definitions';
export interface ClientArgs {
    unsecuredSavedObjectsClient: SavedObjectsClientContract;
}
