/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type CoreSetup, type CoreStart, type Logger } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import { interceptTriggerRecordSavedObject, type InterceptTriggerRecord } from '../saved_objects';

interface InterceptTriggerServiceSetupDeps {
  kibanaVersion: string;
}

export interface InterceptRegistrationCallbackArgs {
  existingTriggerDefinition?: InterceptTriggerRecord | null;
}

export class InterceptTriggerService {
  private logger?: Logger;
  private savedObjectsClient?: ISavedObjectsRepository;
  private kibanaVersion?: string;

  private savedObjectRef = interceptTriggerRecordSavedObject;

  setup(core: CoreSetup, logger: Logger, { kibanaVersion }: InterceptTriggerServiceSetupDeps) {
    this.logger = logger;
    this.kibanaVersion = kibanaVersion;

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
        .catch((err) => {
          // TODO: handle error properly
          this.logger?.error(err.message);
        });
      return;
    } else if (
      // only support updating the trigger interval for existing trigger definitions
      existingTriggerDefinition &&
      existingTriggerDefinition.triggerAfter !== triggerAfter
    ) {
      await this.savedObjectsClient
        ?.update<InterceptTriggerRecord>(this.savedObjectRef.name, triggerId, {
          triggerAfter,
        })
        .catch((err) => {
          // TODO: handle error properly
          this.logger?.error(err.message);
        });
      return;
    }

    // Nothing to do if the trigger interval is the same
  }
}
