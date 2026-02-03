/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import type { TriggerEventData } from '@kbn/workflows-extensions/server';
import type { Streams } from '@kbn/streams-schema';
import type { StreamsPluginStartDependencies } from '../../../types';

/**
 * Change types that can occur when a stream is upserted.
 */
export type StreamChangeType =
  | 'mapping'
  | 'processing'
  | 'description'
  | 'settings'
  | 'lifecycle'
  | 'failure_store';

/**
 * Information about a stream upsert event.
 */
export interface StreamUpsertEvent {
  /** The name of the stream */
  streamName: string;
  /** The types of changes that occurred */
  changeTypes: StreamChangeType[];
  /** Whether this is a new stream or an update to an existing one */
  isCreated: boolean;
  /** The stream definition after the change */
  streamDefinition?: Streams.all.Definition;
  /** The space ID where the change occurred */
  spaceId: string;
  /** The request context (for authorization) */
  request: KibanaRequest;
}

/**
 * Service for firing workflow triggers when stream changes occur.
 */
export class WorkflowTriggerService {
  private readonly logger: Logger;
  private readonly core: CoreSetup<StreamsPluginStartDependencies>;

  constructor(core: CoreSetup<StreamsPluginStartDependencies>, logger: Logger) {
    this.core = core;
    this.logger = logger.get('workflow-triggers');
  }

  /**
   * Fire workflow triggers when a stream is upserted (created or updated).
   *
   * @param event - The stream upsert event
   */
  public async onStreamUpsert(event: StreamUpsertEvent): Promise<void> {
    try {
      const [, plugins] = await this.core.getStartServices();

      if (!plugins.workflowsManagement) {
        this.logger.debug(
          'Workflows management plugin not available, skipping trigger for stream upsert'
        );
        return;
      }

      const { triggerService } = plugins.workflowsManagement;

      const eventData: TriggerEventData = {
        type: 'streams.upsertStream',
        payload: {
          streamName: event.streamName,
          changeTypes: event.changeTypes,
          isCreated: event.isCreated,
          streamDefinition: event.streamDefinition,
        },
      };

      this.logger.debug(
        `Firing streams.upsertStream trigger for stream "${
          event.streamName
        }" with changes: ${event.changeTypes.join(', ')}`
      );

      const result = await triggerService.fireTrigger({
        eventData,
        request: event.request,
        spaceId: event.spaceId,
      });

      if (result.matchedWorkflows > 0) {
        this.logger.info(
          `Stream "${event.streamName}" triggered ${result.scheduledWorkflows}/${result.matchedWorkflows} workflows`
        );
      }

      if (result.errors.length > 0) {
        this.logger.warn(
          `Errors firing triggers for stream "${event.streamName}": ${result.errors
            .map((e: { workflowId: string; error: string }) => `${e.workflowId}: ${e.error}`)
            .join(', ')}`
        );
      }
    } catch (error) {
      // Don't let trigger failures affect the stream operation
      this.logger.error(
        `Failed to fire workflow triggers for stream "${event.streamName}": ${error.message}`
      );
    }
  }

  /**
   * Determine what types of changes occurred between an old and new stream definition.
   *
   * @param oldDefinition - The previous stream definition (undefined for new streams)
   * @param newDefinition - The new stream definition
   * @returns Array of change types
   */
  public static detectChangeTypes(
    oldDefinition: Streams.all.Definition | undefined,
    newDefinition: Streams.all.Definition
  ): StreamChangeType[] {
    const changes: StreamChangeType[] = [];

    // If no old definition, this is a create - all aspects are "changed"
    if (!oldDefinition) {
      // For new streams, report all present aspects as changes
      if (newDefinition.description) {
        changes.push('description');
      }
      if ('wired' in newDefinition.ingest && newDefinition.ingest.wired?.fields) {
        changes.push('mapping');
      }
      if (newDefinition.ingest.processing?.steps?.length) {
        changes.push('processing');
      }
      if (newDefinition.ingest.settings && Object.keys(newDefinition.ingest.settings).length > 0) {
        changes.push('settings');
      }
      if (newDefinition.ingest.lifecycle) {
        changes.push('lifecycle');
      }
      if (newDefinition.ingest.failure_store) {
        changes.push('failure_store');
      }
      return changes;
    }

    // Compare description
    if (oldDefinition.description !== newDefinition.description) {
      changes.push('description');
    }

    // Compare mapping (fields) for wired streams
    if ('wired' in oldDefinition.ingest && 'wired' in newDefinition.ingest) {
      const oldFields = JSON.stringify(oldDefinition.ingest.wired?.fields || {});
      const newFields = JSON.stringify(newDefinition.ingest.wired?.fields || {});
      if (oldFields !== newFields) {
        changes.push('mapping');
      }
    }

    // Compare processing
    const oldProcessing = JSON.stringify(oldDefinition.ingest.processing || {});
    const newProcessing = JSON.stringify(newDefinition.ingest.processing || {});
    if (oldProcessing !== newProcessing) {
      changes.push('processing');
    }

    // Compare settings
    const oldSettings = JSON.stringify(oldDefinition.ingest.settings || {});
    const newSettings = JSON.stringify(newDefinition.ingest.settings || {});
    if (oldSettings !== newSettings) {
      changes.push('settings');
    }

    // Compare lifecycle
    const oldLifecycle = JSON.stringify(oldDefinition.ingest.lifecycle || {});
    const newLifecycle = JSON.stringify(newDefinition.ingest.lifecycle || {});
    if (oldLifecycle !== newLifecycle) {
      changes.push('lifecycle');
    }

    // Compare failure_store
    const oldFailureStore = JSON.stringify(oldDefinition.ingest.failure_store || {});
    const newFailureStore = JSON.stringify(newDefinition.ingest.failure_store || {});
    if (oldFailureStore !== newFailureStore) {
      changes.push('failure_store');
    }

    return changes;
  }
}
