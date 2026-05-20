import type { NewPackagePolicy } from '../../../../../../../common';
import { type VarGroupSelection } from '../../../../../../../common/services/cloud_connectors';
import type { RegistryVarGroup } from '../../../../types';
/**
 * Handler function type for computing policy effects based on var_group selections.
 * Returns partial policy updates or null if no updates needed.
 */
export type PolicyUpdateHandler = (packagePolicy: NewPackagePolicy, varGroupSelections: VarGroupSelection, varGroups: RegistryVarGroup[]) => Partial<NewPackagePolicy> | null;
/**
 * Cloud Connector policy effect handler.
 * Sets supports_cloud_connector, cloud_connector_id, and the supports_cloud_connectors
 * package-level var based on var_group selection.
 *
 * The supports_cloud_connectors var is required for the agent's auth provider to use
 * cloud connector credential exchange. It must always be explicitly false when cloud
 * connector is not selected.
 *
 * When deactivating cloud connector, this also clears cloud-connector vars that hold
 * secret references (isSecretRef: true) at every scope — package vars, input vars,
 * and stream vars — to prevent stale secrets from leaking into agent-based mode.
 * Plain-text vars (e.g. role_arn) are preserved across the switch.
 */
export declare const updateCloudConnectorPolicy: PolicyUpdateHandler;
/**
 * Register a custom policy effect handler.
 * Handlers are called in order of registration.
 */
export declare function registerPolicyUpdateHandler(handler: PolicyUpdateHandler): void;
/**
 * Compute all policy effects based on the current var_group selections.
 * Aggregates results from all registered handlers (e.g., setting
 * supports_cloud_connector and supports_cloud_connectors var).
 */
export declare function buildVarGroupPolicyUpdates(packagePolicy: NewPackagePolicy, varGroupSelections: VarGroupSelection, varGroups: RegistryVarGroup[] | undefined): Partial<NewPackagePolicy> | null;
