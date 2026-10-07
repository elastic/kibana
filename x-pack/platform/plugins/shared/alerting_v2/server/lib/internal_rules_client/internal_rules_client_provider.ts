/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract, SavedObjectsServiceStart } from '@kbn/core/server';
import { CoreStart, Request } from '@kbn/core-di-server';
import { PluginStart, type CoreDiServiceStart } from '@kbn/core-di';
import { Global } from '@kbn/core-di-internal';
import type { SpaceId } from '@kbn/core-spaces-common';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import { inject, injectable } from 'inversify';
import { ALERTING_LOG_CODES } from '../errors/error_codes';
import { RULE_SAVED_OBJECT_TYPE } from '../../saved_objects';
import type { AlertingServerStartDependencies } from '../../types';
import { EventOriginToken } from '../event_origin/token';
import { RulesClient } from '../rules_client';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import { RuleSavedObjectsClientToken } from '../services/rules_saved_object_service/tokens';
import { RequestSpaceIdToken } from '../services/spaces_service/tokens';
import { spaceIdToNamespace } from '../space_id_to_namespace';
import { createInternalUserRequest } from './internal_user_request';

/**
 * Lends a space's {@link RulesClient} running as the internal user. The scope is
 * released once `fn` settles, so the client must not be used after it.
 */
@injectable()
export class InternalRulesClientProvider {
  private readonly internalSavedObjectsClient: SavedObjectsClientContract;
  private readonly logger: LoggerServiceContract;

  constructor(
    @inject(CoreStart('injection')) private readonly injection: CoreDiServiceStart,
    @inject(CoreStart('savedObjects')) savedObjects: SavedObjectsServiceStart,
    @inject(PluginStart<AlertingServerStartDependencies['spaces']>('spaces'))
    private readonly spaces: SpacesPluginStart,
    @inject(LoggerServiceToken) loggerService: LoggerServiceContract
  ) {
    this.internalSavedObjectsClient = savedObjects.getUnsafeInternalClient({
      includedHiddenTypes: [RULE_SAVED_OBJECT_TYPE],
    });
    this.logger = loggerService.forSubsystem('rulesClient');
  }

  public async withRulesClientInSpace<T>(
    spaceId: SpaceId,
    fn: (client: RulesClient) => Promise<T>
  ): Promise<T> {
    const scope = this.injection.fork();
    try {
      scope.bind(Request).toConstantValue(createInternalUserRequest(spaceId));
      scope.bind(Global).toConstantValue(Request);
      scope.bind(RequestSpaceIdToken).toConstantValue(spaceId);
      scope.bind(Global).toConstantValue(RequestSpaceIdToken);
      scope.bind(EventOriginToken).toConstantValue('internal');
      scope.bind(Global).toConstantValue(EventOriginToken);

      const namespace = spaceIdToNamespace(this.spaces, spaceId);
      scope
        .bind(RuleSavedObjectsClientToken)
        .toConstantValue(
          namespace
            ? this.internalSavedObjectsClient.asScopedToNamespace(namespace)
            : this.internalSavedObjectsClient
        );

      return await fn(scope.get(RulesClient));
    } finally {
      // A failed release must not fail a disable that already succeeded.
      await scope.unbindAllAsync().catch((error) => {
        this.logger.warn({
          message: () => `Failed to release the internal rules client scope for space ${spaceId}`,
          error,
          code: ALERTING_LOG_CODES.INTERNAL_RULES_CLIENT_SCOPE_RELEASE_FAILED,
        });
      });
    }
  }
}
