/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type CoreSetup, type CoreStart, type Logger } from '@kbn/core/server';
import type { ISavedObjectsRepository } from '@kbn/core-saved-objects-api-server';
import { interceptTriggerRecordSavedObject, type InterceptTriggerRecord } from '../saved_objects';

interface InterceptTriggerServiceSetupDeps {
  isCloudDeployment: boolean;
  isServerless: boolean;
  kibanaVersion: string;
}

interface InterceptRegistrationCallbackArgs extends InterceptTriggerServiceSetupDeps {
  existingTriggerDefinition?: InterceptTriggerRecord | null;
}

export class InterceptTriggerService {
  private logger?: Logger;
  private savedObjectsClient?: ISavedObjectsRepository;
  private isCloudDeployment?: boolean;
  private isServerlessDeployment?: boolean;
  private kibanaVersion?: string;

  private savedObjectRef = interceptTriggerRecordSavedObject;

  setup(
    core: CoreSetup,
    logger: Logger,
    { isCloudDeployment, isServerless, kibanaVersion }: InterceptTriggerServiceSetupDeps
  ) {
    this.logger = logger;
    this.kibanaVersion = kibanaVersion;
    this.isCloudDeployment = isCloudDeployment;
    this.isServerlessDeployment = isServerless;

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
      this.logger?.error(err);
    }

    return result?.attributes ?? null;
  }

  private async registerTriggerDefinition(
    triggerId: string,
    cb: (args: InterceptRegistrationCallbackArgs) => string | null
  ) {
    const existingTriggerDefinition = await this.fetchRegisteredTask(triggerId);

    const triggerInterval = cb({
      isCloudDeployment: this.isCloudDeployment!,
      isServerless: this.isServerlessDeployment!,
      kibanaVersion: this.kibanaVersion!,
      existingTriggerDefinition,
    });

    if (!triggerInterval) {
      this.logger?.error('Trigger interval is not defined');
      return;
    }

    if (!existingTriggerDefinition) {
      await this.savedObjectsClient
        ?.create<InterceptTriggerRecord>(
          this.savedObjectRef.name,
          {
            firstRegisteredAt: new Date().toISOString(),
            triggerInterval,
            installedOn: this.kibanaVersion!,
          },
          { id: triggerId }
        )
        .catch((err) => {
          // TODO: handle error properly
          this.logger?.error(err);
        });
      return;
    } else if (
      existingTriggerDefinition &&
      existingTriggerDefinition.triggerInterval !== triggerInterval
    ) {
      await this.savedObjectsClient
        ?.update<InterceptTriggerRecord>(this.savedObjectRef.name, triggerId, {
          triggerInterval,
        })
        .catch((err) => {
          // TODO: handle error properly
          this.logger?.error(err);
        });
      return;
    }

    // Nothing to do if the trigger interval is the same
  }
}
