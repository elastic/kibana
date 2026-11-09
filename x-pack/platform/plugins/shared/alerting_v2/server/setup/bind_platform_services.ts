/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreDiServiceStart } from '@kbn/core-di';
import { OnStart, PluginSetup } from '@kbn/core-di';
import { CoreStart, SavedObjectsClientFactory } from '@kbn/core-di-server';
import type { ContainerModuleLoadOptions } from 'inversify';
import { ArtifactTypeRegistry } from '../lib/artifact_types';
import { getKibanaBaseUrl } from '../lib/dispatcher/kibana_base_url';
import { KibanaBaseUrlToken } from '../lib/dispatcher/tokens';
import { ACTION_POLICY_EVENT_PROVIDER } from '../lib/dispatcher/steps/constants';
import { WorkflowsManagementApiToken } from '../lib/dispatcher/steps/dispatch_step_tokens';
import { ApiKeyService } from '../lib/services/api_key_service/api_key_service';
import { ConfigService } from '../lib/services/config_service/config_service';
import { EbtService } from '../lib/services/ebt_service/ebt_service';
import { EbtServiceToken } from '../lib/services/ebt_service/tokens';
import { EventLogService } from '../lib/services/event_log_service/event_log_service';
import { EventLoggerToken, EventLogServiceToken } from '../lib/services/event_log_service/tokens';
import { LicenseService } from '../lib/services/license_service/license_service';
import { LicenseServiceToken } from '../lib/services/license_service/tokens';
import { LoggerService, LoggerServiceToken } from '../lib/services/logger_service/logger_service';
import { MatcherSuggestionsService } from '../lib/services/matcher_suggestions_service/matcher_suggestions_service';
import { PrivilegeChecker } from '../lib/services/privilege_checker/privilege_checker';
import { ResourceManager } from '../lib/services/resource_service/resource_manager';
import { EsTransientRetryService } from '../lib/services/retry_service';
import { RetryServiceToken } from '../lib/services/retry_service/tokens';
import { SettingsService } from '../lib/services/settings_service/settings_service';
import {
  SettingsServiceToken,
  UiSettingsClientToken,
} from '../lib/services/settings_service/tokens';
import { SpacesService } from '../lib/services/spaces_service/spaces_service';
import {
  createTaskRunnerFactory,
  TaskRunnerFactoryToken,
} from '../lib/services/task_run_scope_service/create_task_runner';
import { UserService } from '../lib/services/user_service/user_service';
import { WorkflowService } from '../lib/services/workflow_service/workflow_service';
import { WorkflowServiceToken } from '../lib/services/workflow_service/tokens';
import { SpaceUiSettingsClientToken } from '../settings/tokens';
import type { AlertingServerSetupDependencies } from '../types';

/**
 * Process-wide platform services: logging, config, spaces, licensing, telemetry,
 * settings, event log, resources, privileges, and the task runner factory.
 */
export function bindPlatformServices({ bind }: ContainerModuleLoadOptions) {
  bind(ArtifactTypeRegistry).toSelf();
  bind(SpacesService).toSelf();
  bind(UserService).toSelf().inRequestScope();
  bind(ApiKeyService).toSelf().inRequestScope();
  bind(EsTransientRetryService).toSelf();
  bind(RetryServiceToken).toService(EsTransientRetryService);

  bind(LoggerService).toSelf();
  bind(LoggerServiceToken).toService(LoggerService);

  bind(UiSettingsClientToken).toResolvedValue(
    (savedObjects, uiSettings) =>
      uiSettings.globalAsScopedToClient(savedObjects.createInternalRepository()),
    [CoreStart('savedObjects'), CoreStart('uiSettings')]
  );
  bind(SettingsService).toSelf().inRequestScope();
  bind(SettingsServiceToken).toService(SettingsService);

  bind(SpaceUiSettingsClientToken)
    .toResolvedValue(
      async (savedObjectsClientFactory, uiSettings) =>
        uiSettings.asScopedToClient(await savedObjectsClientFactory()),
      [SavedObjectsClientFactory, CoreStart('uiSettings')]
    )
    .inRequestScope();

  bind(EventLogService).toSelf();
  bind(EventLogServiceToken).toService(EventLogService);
  bind(EventLoggerToken).toResolvedValue(
    (eventLog) => eventLog.getLogger({ event: { provider: ACTION_POLICY_EVENT_PROVIDER } }),
    [PluginSetup<AlertingServerSetupDependencies['eventLog']>('eventLog')]
  );
  bind(WorkflowService).toSelf();
  bind(WorkflowServiceToken).toService(WorkflowService);
  bind(LicenseService).toSelf();
  bind(LicenseServiceToken).toService(LicenseService);
  bind(EbtService).toSelf();
  bind(EbtServiceToken).toService(EbtService);
  bind(ResourceManager).toSelf();
  bind(ConfigService).toSelf();

  // Task Manager is a dependency of this plugin, so it can begin polling and run
  // a task before this plugin's start lifecycle binds `CoreStart('injection')`.
  // Resolving it eagerly would throw when the binding is not yet available. The
  // promise resolves on the plugin's `OnStart` hook, at which point the injection
  // service is guaranteed to be bound, so task runs wait until the plugin starts.
  const injectionPromise = new Promise<CoreDiServiceStart>((resolve) => {
    bind(OnStart).toResolvedValue(
      (injection) => () => resolve(injection),
      [CoreStart('injection')]
    );
  });

  bind(TaskRunnerFactoryToken).toFactory(() => createTaskRunnerFactory({ injectionPromise }));

  bind(WorkflowsManagementApiToken).toResolvedValue(
    (wfm) => wfm.management,
    [PluginSetup<AlertingServerSetupDependencies['workflowsManagement']>('workflowsManagement')]
  );

  // `cloud` is an optional plugin dependency. Expressing an optional single
  // dependency is idiomatic with `get(token, { optional: true })`, so this
  // binding intentionally stays on `toDynamicValue`.
  bind(KibanaBaseUrlToken).toDynamicValue(({ get }) => {
    const http = get(CoreStart('http'));
    const cloud = get(PluginSetup<AlertingServerSetupDependencies['cloud']>('cloud'), {
      optional: true,
    });
    return getKibanaBaseUrl(http, cloud);
  });

  bind(MatcherSuggestionsService).toSelf().inRequestScope();
  bind(PrivilegeChecker).toSelf().inRequestScope();
}
