export { Actions, type CasesSupportedOperations } from '@kbn/security-authorization-core';
export type { AuthorizationServiceSetupInternal } from './authorization_service';
export { AuthorizationService } from './authorization_service';
export type { ElasticsearchRole } from './roles';
export { transformElasticsearchRoleToRole, compareRolesByName } from './roles';
