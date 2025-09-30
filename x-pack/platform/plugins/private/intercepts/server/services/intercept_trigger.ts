/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type CoreSetup, type CoreStart, type Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/server';
import { interceptTriggerRecordSavedObject, type InterceptTriggerRecord } from '../saved_objects';
import { getCounters } from '../usage_collection/intercepts_usage_collection';

interface InterceptTriggerServiceSetupDeps {
  logger: Logger;
  kibanaVersion: string;
  usageCollector?: ReturnType<UsageCollectionSetup['createUsageCounter']>;
}

export interface InterceptRegistrationCallbackArgs {
  existingTriggerDefinition?: InterceptTriggerRecord | null;
}

export class InterceptTriggerService {
  private logger?: Logger;
  private counter?: ReturnType<typeof getCounters>;
  private savedObjectsClient?: ISavedObjectsRepository;
  private kibanaVersion?: string;

  private savedObjectRef = interceptTriggerRecordSavedObject;

  setup(
    core: CoreSetup,
    { kibanaVersion, usageCollector, logger }: InterceptTriggerServiceSetupDeps
  ) {
    this.logger = logger;
    this.kibanaVersion = kibanaVersion;
    this.counter = getCounters(usageCollector);

    core.savedObjects.registerType(this.savedObjectRef);

    return {
      fetchRegisteredTask: this.fetchRegisteredTask.bind(this),
    };
  }

  start(core: CoreStart) {
    this.savedObjectsClient = core.savedObjects.createInternalRepository([
      this.savedObjectRef.name,
    ]);

    return {
      registerTriggerDefinition: this.registerTriggerDefinition.bind(this),
    };
  }

  private async fetchRegisteredTask(triggerId: string) {
    let result;

    try {
      result = await this.savedObjectsClient?.get<InterceptTriggerRecord>(
        interceptTriggerRecordSavedObject.name,
        triggerId
      );
    } catch (err) {
      if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
        // If the task is not found, it means it's not registered yet, so we return null
        return null;
      } else {
        this.logger?.error(`Error fetching registered task: ${err.message}`);
        this.counter?.errorCounter(`productInterceptTriggerRecordFetch:${triggerId}`);
        return null;
      }
    }

    return result?.attributes ?? null;
  }

  private async registerTriggerDefinition(
    triggerId: string,
    cb: (args: InterceptRegistrationCallbackArgs) => {
      triggerAfter: string | null;
      isRecurrent?: boolean;
    }
  ) {
    const existingTriggerDefinition = await this.fetchRegisteredTask(triggerId);

    const { triggerAfter, isRecurrent } = cb({
      existingTriggerDefinition,
    });

    if (!triggerAfter) {
      this.logger?.error('Trigger interval is not defined');
      return;
    }

    if (!existingTriggerDefinition) {
      const contextName = `productInterceptTriggerCreation:${triggerId}` as const;

      await this.savedObjectsClient
        ?.create<InterceptTriggerRecord>(
          this.savedObjectRef.name,
          {
            firstRegisteredAt: new Date().toISOString(),
            triggerAfter,
            installedOn: this.kibanaVersion!,
            recurrent: isRecurrent ?? true,
          },
          { id: triggerId }
        )
        .then((result) => {
          this.counter?.usageCounter(contextName);
          return result;
        })
        .catch((err) => {
          this.logger?.error(err.message);
          this.counter?.errorCounter(contextName);
        });
      return;
    } else if (
      // only support updating the trigger interval for existing trigger definitions
      existingTriggerDefinition &&
      existingTriggerDefinition.triggerAfter !== triggerAfter
    ) {
      const contextName = `productInterceptTriggerUpdate:${triggerId}` as const;

      await this.savedObjectsClient
        ?.update<InterceptTriggerRecord>(this.savedObjectRef.name, triggerId, {
          triggerAfter,
        })
        .then((result) => {
          this.counter?.usageCounter(contextName);
          return result;
        })
        .catch((err) => {
          this.logger?.error(err.message);
          this.counter?.errorCounter(contextName);
        });
      return;
    }

    // Nothing to do if the trigger interval is the same
  }
}
