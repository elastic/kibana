import type { SavedObjectReference } from '@kbn/core/server';
import type { CaseConnector, ExternalService, User } from '../../../common/types/domain';
import type { BuilderDeps, BuilderParameters, CommonBuilderArguments, SavedObjectParameters, UserActionParameters, UserActionEvent } from './types';
import type { PersistableStateAttachmentTypeRegistry } from '../../attachment_framework/persistable_state_registry';
export declare abstract class UserActionBuilder {
    protected readonly persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;
    constructor(deps: BuilderDeps);
    protected getCommonUserActionAttributes({ user, owner }: {
        user: User;
        owner: string;
    }): {
        created_at: string;
        created_by: {
            email: string | null | undefined;
            full_name: string | null | undefined;
            username: string | null | undefined;
        } & {
            profile_uid?: string | undefined;
        };
        owner: string;
    };
    protected extractConnectorId(connector: CaseConnector): Omit<CaseConnector, 'id'>;
    protected createCaseReferences(caseId: string): SavedObjectReference[];
    protected createActionReference(id: string | null, name: string): SavedObjectReference[];
    protected createCommentReferences(id: string | null): SavedObjectReference[];
    protected createConnectorReference(id: string | null): SavedObjectReference[];
    protected createConnectorPushReference(id: string | null): SavedObjectReference[];
    protected extractConnectorIdFromExternalService(externalService: ExternalService): Omit<ExternalService, 'connector_id'>;
    protected buildCommonUserAction: ({ action, user, owner, value, valueKey, caseId, savedObjectId, connectorId, type, }: CommonBuilderArguments) => SavedObjectParameters;
    abstract build<T extends keyof BuilderParameters>(args: UserActionParameters<T>): UserActionEvent | void;
}
