import type { AddSyncedAlertsCountToUserActionsParams, BuildUserActionsDictParams, BuilderParameters, BulkCreateAttachmentUserAction, BulkCreateBulkUpdateCaseUserActions, ServiceContext, UserActionsDict, CreateUserActionArgs, BulkCreateUserActionArgs } from '../types';
export declare class UserActionPersister {
    private readonly context;
    private static readonly userActionFieldsAllowed;
    private readonly builderFactory;
    private readonly auditLogger;
    constructor(context: ServiceContext);
    buildUserActions({ updatedCases, user }: BuildUserActionsDictParams): UserActionsDict;
    addSyncedAlertsCountToUserActions({ userActionsDict, syncedAlertCountCountByCaseId, }: AddSyncedAlertsCountToUserActionsParams): UserActionsDict;
    bulkCreateUpdateCase({ builtUserActions, refresh, }: BulkCreateBulkUpdateCaseUserActions): Promise<void>;
    private getUserActionItemByDifference;
    private buildExtendedFieldsUserActions;
    private buildAssigneesUserActions;
    private buildTagsUserActions;
    private buildSettingsUserActions;
    private buildCustomFieldsUserActions;
    private buildAddDeleteUserActions;
    private buildUserAction;
    bulkCreateAttachmentDeletion({ caseId, attachments, user, refresh, }: BulkCreateAttachmentUserAction): Promise<void>;
    bulkCreateAttachmentCreation({ caseId, attachments, user, refresh, }: BulkCreateAttachmentUserAction): Promise<void>;
    private bulkCreateAttachment;
    private bulkCreateAndLog;
    private bulkCreate;
    createUserAction<T extends keyof BuilderParameters>({ userAction, refresh, }: CreateUserActionArgs<T>): Promise<void>;
    bulkCreateUserAction<T extends keyof BuilderParameters>({ userActions, refresh, }: BulkCreateUserActionArgs<T>): Promise<void>;
    private createAndLog;
    private create;
    bulkAuditLogCaseDeletion(caseIds: string[]): Promise<void>;
}
