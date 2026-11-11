/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from '@kbn/core-di';
import { PluginInitializer, Request } from '@kbn/core-di-server';
import type { ContainerModuleLoadOptions } from 'inversify';
import { ActionPolicyClient } from '../lib/action_policy_client';
import { ActionPolicyNamespaceToken } from '../lib/action_policy_client/tokens';
import { ActionPolicyExecutionHistoryClient } from '../lib/action_policy_execution_history_client';
import { ActionPolicyTestService } from '../lib/action_policy_test/action_policy_test_service';
import { AlertActionsClient } from '../lib/alert_actions_client';
import { AlertEventsClient } from '../lib/alert_events_client';
import { EpisodesClient } from '../lib/episodes_client';
import { EventOriginActorToken } from '../lib/event_origin/token';
import {
  ExecutionHistoryClient,
  ExecutionHistoryClientToken,
} from '../lib/execution_history_client';
import { InternalRulesClient, InternalRulesClientProvider } from '../lib/internal_rules_client';
import {
  createChangeHistoryClient,
  ChangeHistoryClientToken,
  RuleChangesHistoryClient,
  RuleChangesHistoryClientToken,
  RuleChangesHistoryService,
  RuleChangesHistoryServiceToken,
} from '../lib/rule_changes_history';
import { RulesClient } from '../lib/rules_client';
import { RulesClientEventOriginToken, RulesClientOptionsToken } from '../lib/rules_client/tokens';
import { RuleTemplatesClient } from '../lib/rule_templates_client';
import { SpacesService } from '../lib/services/spaces_service/spaces_service';
import { RequestSpaceIdToken } from '../lib/services/spaces_service/tokens';

/**
 * Request-scoped domain clients resolved per request by the routes and the plugin
 * contract, plus the request-scoped tokens that parameterize them (event origin,
 * client options, space id/namespace).
 */
export function bindClients({ bind }: ContainerModuleLoadOptions) {
  bind(AlertActionsClient).toSelf().inRequestScope();
  bind(AlertEventsClient).toSelf().inRequestScope();
  bind(EpisodesClient).toSelf().inRequestScope();
  bind(RulesClient).toSelf().inRequestScope();
  bind(InternalRulesClientProvider).toSelf();
  bind(InternalRulesClient).toSelf();
  bind(ActionPolicyClient).toSelf().inRequestScope();
  bind(ActionPolicyExecutionHistoryClient).toSelf().inRequestScope();
  bind(ActionPolicyTestService).toSelf().inRequestScope();
  bind(RuleTemplatesClient).toSelf().inRequestScope();
  bind(ExecutionHistoryClient).toSelf().inRequestScope();
  bind(ExecutionHistoryClientToken).toService(ExecutionHistoryClient);

  bind(EventOriginActorToken).toConstantValue('user');
  bind(RulesClientOptionsToken).toConstantValue({});
  // Fold the request-scope actor and the caller's client options into the single
  // value the rules client injects as its event origin.
  bind(RulesClientEventOriginToken)
    .toResolvedValue(
      (actor, options) => ({ actor, options }),
      [EventOriginActorToken, RulesClientOptionsToken]
    )
    .inRequestScope();

  bind(RequestSpaceIdToken)
    .toResolvedValue(
      (request, spacesService) => spacesService.getSpaceId(request),
      [Request, SpacesService]
    )
    .inRequestScope();
  bind(ActionPolicyNamespaceToken)
    .toResolvedValue(
      (request, spacesService) => spacesService.getNamespace(request),
      [Request, SpacesService]
    )
    .inRequestScope();

  bind(ChangeHistoryClientToken).toResolvedValue(
    (logger, env) =>
      createChangeHistoryClient({
        logger: logger.get('rule_changes_history'),
        kibanaVersion: env.packageInfo.version,
      }),
    [Logger, PluginInitializer('env')]
  );
  bind(RuleChangesHistoryService).toSelf();
  bind(RuleChangesHistoryServiceToken).toService(RuleChangesHistoryService);
  bind(RuleChangesHistoryClient).toSelf().inRequestScope();
  bind(RuleChangesHistoryClientToken).toService(RuleChangesHistoryClient);
}
