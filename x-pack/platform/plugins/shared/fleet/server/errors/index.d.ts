import { FleetError } from '../../common/errors';
export { defaultFleetErrorHandler as defaultFleetErrorHandler, fleetErrorToResponseOptions, } from './handlers';
export { isESClientError, rethrowIfInstanceOrWrap, getErrorMessage } from './utils';
export { FleetError as FleetError, FleetVersionConflictError, OutputInvalidError as OutputInvalidError, AgentlessAgentCreateOverProvisionedError as AgentlessAgentCreateOverProvisionnedError, } from '../../common/errors';
export declare class FleetErrorWithStatusCode<TMeta = unknown> extends FleetError<TMeta> {
    readonly meta?: TMeta | undefined;
    readonly statusCode: number | undefined;
    constructor(message?: string, statusCode?: number, meta?: TMeta | undefined);
}
export declare class RegistryError extends FleetError {
}
export declare class RegistryConnectionError extends RegistryError {
}
export declare class RegistryResponseError extends RegistryError {
    readonly status?: number | undefined;
    constructor(message?: string, status?: number | undefined);
}
export declare class PackageInvalidDeploymentMode extends FleetError {
}
export declare class PackageOutdatedError extends FleetError {
}
export declare class PackageFailedVerificationError extends FleetError {
    constructor(pkgName: string, pkgVersion: string);
}
export declare class PackageUnsupportedMediaTypeError extends FleetError {
}
export declare class PackageInvalidArchiveError extends FleetError {
}
export declare class PackageRemovalError extends FleetError {
}
export declare class PackageESError extends FleetError {
}
export declare class ConcurrentInstallOperationError extends FleetError {
}
export declare class PackageSavedObjectConflictError extends FleetError {
}
export declare class KibanaSOReferenceError extends FleetError {
}
export declare class PackageAlreadyInstalledError extends FleetError {
}
export declare class PackageRollbackError extends FleetError {
}
export declare class AgentPolicyError extends FleetError {
}
export declare class AgentRequestInvalidError extends FleetError {
}
export declare class AgentPolicyInvalidError extends FleetError {
}
export declare class AgentlessAgentCreateError extends FleetError {
    constructor(message: string);
}
export declare class AgentlessAgentDeleteError extends FleetError {
    constructor(message: string);
}
export declare class AgentlessAgentUpgradeError extends FleetError {
    constructor(message: string);
}
export declare class AgentlessAgentListNotFoundError extends FleetError {
    constructor(message: string);
}
export declare class AgentlessAgentListError extends FleetError {
    constructor(message: string);
}
export declare class AgentlessAgentConfigError extends FleetError {
    constructor(message: string);
}
export declare class AgentlessPolicyExistsRequestError extends AgentPolicyError {
    constructor(message: string);
}
export declare class CloudConnectorCreateError extends FleetError {
    constructor(message: string);
}
export declare class CloudConnectorGetListError extends FleetError {
    constructor(message: string);
}
export declare class CloudConnectorInvalidVarsError extends FleetError {
    constructor(message: string);
}
export declare class CloudConnectorDeleteError extends FleetError {
    constructor(message: string);
}
export declare class CloudConnectorUpdateError extends FleetError {
    constructor(message: string);
}
export declare class AgentPolicyNameExistsError extends AgentPolicyError {
}
export declare class AgentReassignmentError extends FleetError {
}
export declare class AgentRollbackError extends FleetError {
    constructor(message: string);
}
export declare class PackagePolicyIneligibleForUpgradeError extends FleetError {
}
export declare class PackagePolicyValidationError extends FleetError {
}
export declare class PackagePolicyNameExistsError extends FleetError {
}
export declare class BundledPackageLocationNotFoundError extends FleetError {
}
export declare class PackagePolicyRequestError extends FleetError {
}
export declare class PackagePolicyMultipleAgentPoliciesError extends FleetError {
}
export declare class PackagePolicyOutputError extends FleetError {
}
export declare class PackagePolicyContentPackageError extends FleetError {
}
export declare class CustomPackagePolicyNotAllowedForAgentlessError extends FleetError {
    constructor(message?: string);
}
export declare class EnrollmentKeyNameExistsError extends FleetError {
}
export declare class HostedAgentPolicyRestrictionRelatedError extends FleetError {
    constructor(message?: string);
}
export declare class PackagePolicyRestrictionRelatedError extends FleetError {
    constructor(message?: string);
}
export declare class FleetEncryptedSavedObjectEncryptionKeyRequired extends FleetError {
}
export declare class FleetSetupError extends FleetError {
}
export declare class GenerateServiceTokenError extends FleetError {
}
export declare class FleetUnauthorizedError extends FleetError {
}
export declare class FleetNotFoundError<TMeta = unknown> extends FleetError<TMeta> {
}
export declare class FleetTooManyRequestsError extends FleetError {
}
export declare class OutputUnauthorizedError extends FleetError {
}
export declare class OutputLicenceError extends FleetError {
}
export declare class DownloadSourceError extends FleetError {
}
export declare class DeleteUnenrolledAgentsPreconfiguredError extends FleetError {
}
export declare class AgentNotFoundError extends FleetNotFoundError<{
    agentId: string;
}> {
}
export declare class AgentPolicyNotFoundError extends FleetNotFoundError {
}
export declare class AgentActionNotFoundError extends FleetNotFoundError {
}
export declare class DownloadSourceNotFound extends FleetNotFoundError {
}
export declare class EnrollmentKeyNotFoundError extends FleetNotFoundError {
}
export declare class FleetServerHostNotFoundError extends FleetNotFoundError {
}
export declare class SigningServiceNotFoundError extends FleetNotFoundError {
}
export declare class InputNotFoundError extends FleetNotFoundError {
}
export declare class OutputNotFoundError extends FleetNotFoundError {
}
export declare class PackageNotFoundError extends FleetNotFoundError {
}
export declare class ArchiveNotFoundError extends FleetNotFoundError {
}
export declare class IndexNotFoundError extends FleetNotFoundError {
}
export declare class CustomIntegrationNotFoundError extends FleetNotFoundError {
}
export declare class NotACustomIntegrationError extends FleetNotFoundError {
}
export declare class PackagePolicyNotFoundError extends FleetNotFoundError<{
    /** The package policy ID that was not found */
    packagePolicyId: string;
}> {
}
export declare class StreamNotFoundError extends FleetNotFoundError {
}
export declare class FleetServerHostUnauthorizedError extends FleetUnauthorizedError {
}
export declare class FleetProxyUnauthorizedError extends FleetUnauthorizedError {
}
export declare class ArtifactsClientError extends FleetError {
}
export declare class ArtifactsClientAccessDeniedError extends FleetError {
    constructor(deniedPackageName: string, allowedPackageName: string);
}
export declare class ArtifactsElasticsearchError extends FleetError {
    readonly meta: Error;
    readonly requestDetails: string;
    constructor(meta: Error);
}
export declare class FleetElasticsearchError extends FleetErrorWithStatusCode {
    constructor(esError: Error);
}
export declare class FleetFilesClientError extends FleetError {
}
export declare class FleetFileNotFound extends FleetFilesClientError {
}
