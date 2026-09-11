/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext } from '@kbn/core/public';

import { lazy } from 'react';

import { FleetPlugin } from './plugin';

export type { GetPackagesResponse } from './types';
export { installationStatuses } from '../common/constants';

export type { FleetSetup, FleetStart, FleetStartServices } from './plugin';

export const plugin = (initializerContext: PluginInitializerContext) => {
  return new FleetPlugin(initializerContext);
};

export type { NewPackagePolicy, KibanaSavedObjectType } from './types';
export { SetupTechnology } from './types';
export type {
  CloudConnector,
  CloudConnectorListOptions,
  CreateCloudConnectorRequest,
  CloudConnectorVars,
  CloudProvider,
  AccountType,
  CloudConnectorSecretVar,
  AwsCloudConnectorVars,
} from './types';
export {
  SetupTechnologySelector,
  SETUP_TECHNOLOGY_SELECTOR_TEST_SUBJ,
} from './services/setup_technology_selector';
export type {
  AgentDetailsReassignPolicyAction,
  AgentPolicyDetailsDeployAgentAction,
  AnyIntraAppRouteState,
  CreatePackagePolicyRouteState,
  IntegrationsAppBrowseRouteState,
  OnSaveQueryParamKeys,
  OnSaveQueryParamOpts,
} from './types/intra_app_route_state';
export type {
  AgentEnrollmentFlyoutFinalStepExtension,
  PackageAssetsComponent,
  PackageAssetsExtension,
  PackageCustomExtension,
  PackageCustomExtensionComponent,
  PackageCustomExtensionComponentProps,
  PackagePolicyCreateExtension,
  PackagePolicyCreateExtensionComponent,
  PackagePolicyCreateExtensionComponentProps,
  PackagePolicyCreateBottomExtension,
  PackagePolicyCreateBottomExtensionComponent,
  PackagePolicyCreateBottomExtensionComponentProps,
  PackagePolicyEditExtension,
  PackagePolicyEditExtensionComponent,
  PackagePolicyEditExtensionComponentProps,
  PackagePolicyEditTabsExtension,
  PackagePolicyResponseExtension,
  PackagePolicyResponseExtensionComponent,
  PackagePolicyResponseExtensionComponentProps,
  PackageGenericErrorsListProps,
  PackageGenericErrorsListComponent,
  UIExtensionPoint,
  UIExtensionRegistrationCallback,
  UIExtensionsStorage,
} from './types/ui_extensions';

export {
  pagePathGetters,
  EPM_API_ROUTES,
  CLOUD_CONNECTOR_API_ROUTES,
  OBLT_DEFAULT_CATEGORIES,
} from './constants';
export { pkgKeyFromPackageInfo } from './services';
export type { CustomAssetsAccordionProps } from './components/custom_assets_accordion';
export { CustomAssetsAccordion } from './components/custom_assets_accordion';
export { AssetTitleMap } from './applications/integrations/sections/epm/constants';
export { CardIcon, PackageIcon } from './components/package_icon';
export { DataStreamTypeSelector } from './components/data_stream_type_selector';
export type { DataStreamTypeSelectorProps } from './components/data_stream_type_selector';
// Export Package editor components for custom editors
export { PackagePolicyEditorDatastreamPipelines } from './applications/fleet/sections/agent_policy/create_package_policy_page/components/datastream_pipelines';
export type { PackagePolicyEditorDatastreamPipelinesProps } from './applications/fleet/sections/agent_policy/create_package_policy_page/components/datastream_pipelines';
export { PackagePolicyEditorDatastreamMappings } from './applications/fleet/sections/agent_policy/create_package_policy_page/components/datastream_mappings';
export type { PackagePolicyEditorDatastreamMappingsProps } from './applications/fleet/sections/agent_policy/create_package_policy_page/components/datastream_mappings';
export type { DynamicPagePathValues } from './constants';

// This Type export is added to prevent error TS4023
export type { InputFieldProps } from './applications/fleet/sections/agent_policy/create_package_policy_page/components/steps/components/package_policy_input_var_field';

// Fleet status — required by PackagePolicyInputVarField when rendered outside Fleet's app
export { FleetStatusProvider } from './hooks/use_fleet_status';
export type { FleetStatusProviderProps } from './hooks/use_fleet_status';

export const LazyPackagePolicyInputVarField = lazy(() =>
  import(
    './applications/fleet/sections/agent_policy/create_package_policy_page/components/steps/components/package_policy_input_var_field'
  ).then((module) => ({ default: module.PackagePolicyInputVarField }))
);
export type { PackageListGridProps } from './applications/integrations/sections/epm/components/package_list_grid';
export type { AvailablePackagesHookType } from './applications/integrations/sections/epm/screens/home/hooks/use_available_packages';
export type { IntegrationCardItem } from './applications/integrations/sections/epm/screens/home';
export type { CategoryFacet } from './applications/integrations/sections/epm/screens/home/category_facets';

export const PackageList = () => {
  return import('./applications/integrations/sections/epm/components/package_list_grid');
};
export const AvailablePackagesHook = () => {
  return import(
    './applications/integrations/sections/epm/screens/home/hooks/use_available_packages'
  );
};
export const LocalSearchHook = () => {
  return import('./applications/integrations/hooks/use_local_search');
};
export type { UseLocalSearchType } from './applications/integrations/hooks/use_local_search';

export const LazyPackageCard = lazy(() =>
  import('./applications/integrations/sections/epm/components/package_card').then((module) => ({
    default: module.PackageCard,
  }))
);

export { useGetDataStreams } from './hooks/use_request/data_stream';
export { useGetPackagesQuery, useGetPackageInfoByKeyQuery } from './hooks/use_request/epm';
export { useGetSettingsQuery } from './hooks/use_request/settings';
export { sendCreateAgentlessPolicy } from './hooks/use_request/agentless_policy';
export { sendGetPackageInfoByKey, sendGetPackageInfoByKeyForRq } from './hooks/use_request/epm';
export { useLink } from './hooks/use_link';
export { NamespaceComboBox } from './components/namespace_combo_box';

// Cloud Connector Setup - lazy loaded component for external plugins
export const LazyCloudConnectorSetup = lazy(() =>
  import('./components/cloud_connector').then((module) => ({
    default: module.CloudConnectorSetup,
  }))
);
export type { CloudConnectorSetupProps } from './components/cloud_connector';
export { CLOUD_CONNECTOR_GCP_ASSET_INVENTORY_REUSABLE_MIN_VERSION } from './components/cloud_connector/constants';

// AWS Connect Setup - auth method picker (Identity Federation + Static keys + Temporary keys) for external plugins
export const LazyAwsConnectSetup = lazy(() =>
  import('./components/cloud_connector').then((module) => ({
    default: module.AwsConnectSetup,
  }))
);
export type {
  AwsConnectSetupProps,
  AwsAuthType,
  AwsStaticKeyCredentials,
  AwsTemporaryKeyCredentials,
  CloudSetupForCloudConnector,
} from './components/cloud_connector';
export {
  AWS_AUTH_TYPE_SELECTOR_TEST_SUBJ,
  AWS_AUTH_TYPE_IF_CARD_TEST_SUBJ,
  AWS_AUTH_TYPE_STATIC_KEYS_CARD_TEST_SUBJ,
  AWS_AUTH_TYPE_TEMPORARY_KEYS_CARD_TEST_SUBJ,
} from './components/cloud_connector/aws_connect_setup/test_subjects';

// AWS Static Keys Form — standalone credential form for cross-plugin use
export const LazyAwsStaticKeysForm = lazy(() =>
  import('./components/cloud_connector/aws_connect_setup/aws_static_keys_form').then((module) => ({
    default: module.AwsStaticKeysForm,
  }))
);
export type { AwsStaticKeysFormProps } from './components/cloud_connector/aws_connect_setup/aws_static_keys_form';

// AWS Identity Federation Setup — connector creation/selection for cross-plugin use
export const LazyAwsIdentityFederationSetup = lazy(() =>
  import('./components/cloud_connector/aws_connect_setup/aws_identity_federation_setup').then(
    (module) => ({ default: module.AwsIdentityFederationSetup })
  )
);
export type { AwsIdentityFederationSetupProps } from './components/cloud_connector/aws_connect_setup/aws_identity_federation_setup';

export { getAnyCloudConnectorIacTemplateUrl } from './components/cloud_connector/utils';

// KibanaVersionContext — must be provided by any plugin that renders Fleet components
// that call useKibanaVersion() (e.g. AgentEnrollmentFlyout → installation_message.tsx).
// Without a KibanaVersionContext.Provider ancestor the hook throws by design.
// See: public/hooks/use_kibana_version.ts
export { KibanaVersionContext } from './hooks/use_kibana_version';

// FlyoutContextProvider — required by AgentEnrollmentFlyout → EnrollmentRecommendation →
// useFlyoutContext(). The hook throws if the context is absent. Add this provider alongside
// FleetStatusProvider and KibanaVersionContext in any host app that renders the flyout.
// See: public/hooks/use_flyout_context.tsx
export { FlyoutContextProvider } from './hooks/use_flyout_context';

// AgentEnrollmentFlyout — ingest_hub is the first plugin to render this outside Fleet.
// Justification: ~1500 lines of platform-tab / enroll-command / root-privileges /
// confirmation logic that must stay bit-identical; duplicating it guarantees drift.
// Two providers MUST be present in the host app for this to render without throwing:
//   1. authz: deps.fleet.authz  added to KibanaContextProvider services
//   2. <KibanaVersionContext.Provider value={kibanaVersion}>
// See plan for ingest-dev#9079 for full provider wiring details.
export const LazyAgentEnrollmentFlyout = lazy(() =>
  import('./components/agent_enrollment_flyout').then((m) => ({
    default: m.AgentEnrollmentFlyout,
  }))
);
// Narrow public surface — avoids TS4023 from unexported types in the full FlyOutProps.
export interface AgentEnrollmentFlyoutProps {
  onClose: () => void;
  agentPolicy?: import('./types').AgentPolicy;
  selectedAgentPolicies?: Array<import('./types').AgentPolicy>;
  defaultMode?: 'managed' | 'standalone' | 'kubernetes';
  isIntegrationFlow?: boolean;
}
// AgentPolicy is required by AgentEnrollmentFlyoutProps — type-only, zero bundle cost.
export type { AgentPolicy } from './types';

// AWS Temporary Keys Form — standalone for cross-plugin use (parallel to LazyAwsStaticKeysForm)
export const LazyAwsTemporaryKeysForm = lazy(() =>
  import('./components/cloud_connector/aws_connect_setup/aws_temporary_keys_form').then(
    (module) => ({ default: module.AwsTemporaryKeysForm })
  )
);
export type { AwsTemporaryKeysFormProps } from './components/cloud_connector/aws_connect_setup/aws_temporary_keys_form';

// Agent policies query — used by the agent-based policy selector in ingest_hub
export { useGetAgentPoliciesQuery } from './hooks/use_request/agent_policy';

// Imperative agent policies fetcher — used to resolve the next available policy name
export { sendGetAgentPolicies } from './hooks/use_request/agent_policy';

// Agent status — used by step 4 agent count summary field
export { useGetAgentStatus } from './hooks/use_request/agents';

// Enrollment API keys query — used by step 4 enrollment token summary field
export { useGetEnrollmentAPIKeysQuery } from './hooks/use_request/enrollment_api_keys';

// Combined agent-policy + package-policies creation — one transactional server-side call.
// IMPORTANT: this route is registered at API_VERSIONS.public.v1 ('2023-10-31') despite the
// /internal/ URL path. Do NOT change to internal.v1 ('1') — it returns 400 Unsupported version.
// See: fleet/server/routes/agent_policy/index.ts ~line 308.
export { sendCreateAgentPolicyWithPackagePolicies } from './hooks/use_request/agent_policy';

// Package policy creation — used by the existing-agent-policy path in ingest_hub
export { sendCreatePackagePolicyForRq as sendCreatePackagePolicy } from './hooks/use_request/package_policy';
