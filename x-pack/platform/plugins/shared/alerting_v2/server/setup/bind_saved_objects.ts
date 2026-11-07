/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginStart } from '@kbn/core-di';
import { CoreStart, SavedObjectsClientFactory } from '@kbn/core-di-server';
import type { ContainerModuleLoadOptions } from 'inversify';
import { MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE } from '@kbn/maintenance-windows-plugin/common';
import { ActionPolicySavedObjectService } from '../lib/services/action_policy_saved_object_service/action_policy_saved_object_service';
import {
  ActionPolicySavedObjectsClientToken,
  ActionPolicySavedObjectServiceInternalToken,
  ActionPolicySavedObjectServiceScopedToken,
} from '../lib/services/action_policy_saved_object_service/tokens';
import { ApiKeyServiceSavedObjectsClientToken } from '../lib/services/api_key_service/tokens';
import { MaintenanceWindowService } from '../lib/services/maintenance_window_service/maintenance_window_service';
import {
  MaintenanceWindowSavedObjectsClientToken,
  MaintenanceWindowServiceInternalToken,
} from '../lib/services/maintenance_window_service/tokens';
import { RulesSavedObjectService } from '../lib/services/rules_saved_object_service/rules_saved_object_service';
import {
  RuleSavedObjectsClientToken,
  RulesSavedObjectServiceInternalToken,
  RulesSavedObjectServiceScopedToken,
} from '../lib/services/rules_saved_object_service/tokens';
import { SpacesService } from '../lib/services/spaces_service/spaces_service';
import { EncryptedSavedObjectsClientToken } from '../lib/dispatcher/steps/dispatch_step_tokens';
import {
  API_KEY_PENDING_INVALIDATION_TYPE,
  ACTION_POLICY_SAVED_OBJECT_TYPE,
  RULE_SAVED_OBJECT_TYPE,
} from '../saved_objects';
import { RULE_TEMPLATE_SAVED_OBJECT_TYPE } from '../../common/saved_object_types';
import { RuleTemplateSavedObjectsClientToken } from '../lib/rule_templates_client';
import type { AlertingServerStartDependencies } from '../types';

/**
 * Saved-object client factories and the saved-object-backed services (rules,
 * action policies, maintenance windows, api keys), in both request-scoped and
 * internal (singleton) flavors.
 */
export function bindSavedObjects({ bind }: ContainerModuleLoadOptions) {
  bind(RuleSavedObjectsClientToken)
    .toResolvedValue(
      (savedObjectsClientFactory) =>
        savedObjectsClientFactory({ includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE] }),
      [SavedObjectsClientFactory]
    )
    .inRequestScope();

  // The `alerting_rule_template` type is hidden and owned by the alerting (v1)
  // plugin, so it has to be opted into explicitly here.
  bind(RuleTemplateSavedObjectsClientToken)
    .toResolvedValue(
      (savedObjectsClientFactory) =>
        savedObjectsClientFactory({ includedHiddenTypes: [RULE_TEMPLATE_SAVED_OBJECT_TYPE] }),
      [SavedObjectsClientFactory]
    )
    .inRequestScope();

  bind(RulesSavedObjectService).toSelf().inRequestScope();
  bind(RulesSavedObjectServiceScopedToken).toService(RulesSavedObjectService);
  bind(RulesSavedObjectServiceInternalToken).toResolvedValue(
    (savedObjects, spacesService) =>
      new RulesSavedObjectService(
        savedObjects.createInternalRepository([RULE_SAVED_OBJECT_TYPE]),
        spacesService
      ),
    [CoreStart('savedObjects'), SpacesService]
  );

  bind(MaintenanceWindowSavedObjectsClientToken).toResolvedValue(
    (savedObjects) => savedObjects.createInternalRepository([MAINTENANCE_WINDOW_SAVED_OBJECT_TYPE]),
    [CoreStart('savedObjects')]
  );

  bind(MaintenanceWindowServiceInternalToken).toResolvedValue(
    (client) => new MaintenanceWindowService(client),
    [MaintenanceWindowSavedObjectsClientToken]
  );

  bind(EncryptedSavedObjectsClientToken).toResolvedValue(
    (eso) => eso.getClient({ includedHiddenTypes: [ACTION_POLICY_SAVED_OBJECT_TYPE] }),
    [PluginStart<AlertingServerStartDependencies['encryptedSavedObjects']>('encryptedSavedObjects')]
  );

  bind(ActionPolicySavedObjectsClientToken)
    .toResolvedValue(
      (savedObjectsClientFactory) =>
        savedObjectsClientFactory({
          includedHiddenTypes: [ACTION_POLICY_SAVED_OBJECT_TYPE],
        }),
      [SavedObjectsClientFactory]
    )
    .inRequestScope();

  bind(ActionPolicySavedObjectService).toSelf().inRequestScope();
  bind(ActionPolicySavedObjectServiceScopedToken).toService(ActionPolicySavedObjectService);
  bind(ActionPolicySavedObjectServiceInternalToken).toResolvedValue(
    (savedObjects, spacesService, esoClient) =>
      new ActionPolicySavedObjectService(
        savedObjects.createInternalRepository([ACTION_POLICY_SAVED_OBJECT_TYPE]),
        spacesService,
        esoClient
      ),
    [CoreStart('savedObjects'), SpacesService, EncryptedSavedObjectsClientToken]
  );

  bind(ApiKeyServiceSavedObjectsClientToken).toResolvedValue(
    (savedObjects) => savedObjects.createInternalRepository([API_KEY_PENDING_INVALIDATION_TYPE]),
    [CoreStart('savedObjects')]
  );
}
