/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNotFoundError } from '@kbn/es-errors';
import type {
  IngestStreamLifecycle,
  StreamDefinition,
  WiredStreamDefinition,
} from '@kbn/streams-schema';
import {
  getAncestors,
  getAncestorsAndSelf,
  getParentId,
  isChildOf,
  isDescendantOf,
  isRootStreamDefinition,
  isUnwiredStreamDefinition,
  isWiredStreamDefinition,
  isIlmLifecycle,
} from '@kbn/streams-schema';
import _, { cloneDeep } from 'lodash';
import { generateLayer } from '../../component_templates/generate_layer';
import { getComponentTemplateName } from '../../component_templates/name';
import { isDefinitionNotFoundError } from '../../errors/definition_not_found_error';
import { NameTakenError } from '../../errors/name_taken_error';
import { StatusError } from '../../errors/status_error';
import {
  validateAncestorFields,
  validateDescendantFields,
  validateSystemFields,
} from '../../helpers/validate_fields';
import { validateRootStreamChanges } from '../../helpers/validate_stream';
import { generateIndexTemplate } from '../../index_templates/generate_index_template';
import { getIndexTemplateName } from '../../index_templates/name';
import { generateIngestPipeline } from '../../ingest_pipelines/generate_ingest_pipeline';
import { generateReroutePipeline } from '../../ingest_pipelines/generate_reroute_pipeline';
import { getProcessingPipelineName, getReroutePipelineName } from '../../ingest_pipelines/name';
import type { ElasticsearchAction } from '../execution_plan/types';
import type { State } from '../state';
import type { StateDependencies, StreamChange } from '../types';
import type {
  PrintableStream,
  StreamChangeStatus,
  ValidationResult,
} from '../stream_active_record/stream_active_record';
import { StreamActiveRecord } from '../stream_active_record/stream_active_record';
import { hasSupportedStreamsRoot } from '../../root_stream_definition';

export class WiredStream extends StreamActiveRecord<WiredStreamDefinition> {
  private _ownFieldsChanged: boolean = false;
  private _routingChanged: boolean = false;
  private _processingChanged: boolean = false;
  private _lifeCycleChanged: boolean = false;

  constructor(definition: WiredStreamDefinition, dependencies: StateDependencies) {
    super(definition, dependencies);
  }

  clone(): StreamActiveRecord<WiredStreamDefinition> {
    return new WiredStream(cloneDeep(this._definition), this.dependencies);
  }

  toPrintable(): PrintableStream {
    return {
      ...super.toPrintable(),
      processingChanged: this._processingChanged,
      lifeCycleChanged: this._lifeCycleChanged,
      routingChanged: this._routingChanged,
      ownFieldsChanged: this._ownFieldsChanged,
    };
  }

  protected async doHandleUpsertChange(
    definition: StreamDefinition,
    desiredState: State,
    startingState: State
  ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }> {
    if (definition.name !== this._definition.name) {
      // if the an ancestor stream gets upserted, we might need to update the stream - mark as upserted
      // so we check for updates during the Elasticsearch action planning phase.
      const ancestorHasChanged =
        isWiredStreamDefinition(definition) &&
        isDescendantOf(definition.name, this._definition.name);

      return {
        changeStatus: ancestorHasChanged && !this.isDeleted() ? 'upserted' : this.changeStatus,
        cascadingChanges: [],
      };
    }

    if (!isWiredStreamDefinition(definition)) {
      throw new StatusError('Cannot change stream types', 400);
    }

    this._definition = definition;

    const startingStateStreamDefinition = startingState.get(this._definition.name)?.definition;

    if (startingStateStreamDefinition && !isWiredStreamDefinition(startingStateStreamDefinition)) {
      throw new StatusError('Unexpected starting state stream type', 400);
    }

    this._ownFieldsChanged =
      !startingStateStreamDefinition ||
      !_.isEqual(
        this._definition.ingest.wired.fields,
        startingStateStreamDefinition.ingest.wired.fields
      );

    this._routingChanged =
      !startingStateStreamDefinition ||
      !_.isEqual(
        this._definition.ingest.wired.routing,
        startingStateStreamDefinition.ingest.wired.routing
      );

    this._processingChanged =
      !startingStateStreamDefinition ||
      !_.isEqual(
        this._definition.ingest.processing,
        startingStateStreamDefinition.ingest.processing
      );

    this._lifeCycleChanged =
      !startingStateStreamDefinition ||
      !_.isEqual(this._definition.ingest.lifecycle, startingStateStreamDefinition.ingest.lifecycle);

    const parentId = getParentId(this._definition.name);
    const cascadingChanges: StreamChange[] = [];
    if (parentId && !desiredState.has(parentId)) {
      cascadingChanges.push({
        type: 'upsert',
        definition: {
          name: parentId,
          ingest: {
            lifecycle: { inherit: {} },
            processing: [],
            wired: {
              fields: {},
              routing: [
                {
                  destination: this._definition.name,
                  if: { never: {} },
                },
              ],
            },
          },
        },
      });
    }

    if (this._routingChanged) {
      const routeTargets = this._definition.ingest.wired.routing.map(
        (routing) => routing.destination
      );

      for (const routeTarget of routeTargets) {
        if (!desiredState.has(routeTarget)) {
          cascadingChanges.push({
            type: 'upsert',
            definition: {
              name: routeTarget,
              ingest: {
                lifecycle: { inherit: {} },
                processing: [],
                wired: {
                  fields: {},
                  routing: [],
                },
              },
            },
          });
        }
      }
    }

    if (parentId && desiredState.has(parentId)) {
      const parentStream = desiredState.get(parentId) as WiredStream;
      // if the parent hasn't changed already, ensure it has the correct routing
      // if it has changed, the routing will be updated in the parent's upsert
      if (!parentStream.hasChanged()) {
        const currentParentRouting = parentStream.definition.ingest.wired.routing;
        const hasChild = currentParentRouting.some(
          (routing) => routing.destination === this._definition.name
        );
        if (!hasChild) {
          cascadingChanges.push({
            type: 'upsert',
            definition: {
              name: parentId,
              ingest: {
                ...parentStream.definition.ingest,
                wired: {
                  ...parentStream.definition.ingest.wired,
                  routing: [
                    ...currentParentRouting,
                    {
                      destination: this._definition.name,
                      if: { never: {} },
                    },
                  ],
                },
              },
            },
          });
        }
      }
    }

    return { cascadingChanges, changeStatus: 'upserted' };
  }

  protected async doHandleDeleteChange(
    target: string,
    desiredState: State,
    startingState: State
  ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }> {
    if (target !== this._definition.name) {
      return { cascadingChanges: [], changeStatus: this.changeStatus };
    }

    const cascadingChanges: StreamChange[] = [];
    const parentId = getParentId(this._definition.name);
    if (parentId) {
      const parentStream = desiredState.get(parentId) as WiredStream;
      // if the parent hasn't changed already, ensure it has the correct routing
      // if it has changed, the routing will be updated in the parent's upsert
      if (!parentStream.hasChanged()) {
        const currentParentRouting = parentStream.definition.ingest.wired.routing;
        const hasChild = currentParentRouting.some(
          (routing) => routing.destination === this._definition.name
        );
        if (hasChild) {
          cascadingChanges.push({
            type: 'upsert',
            definition: {
              name: parentId,
              ingest: {
                ...parentStream.definition.ingest,
                wired: {
                  ...parentStream.definition.ingest.wired,
                  routing: parentStream.definition.ingest.wired.routing.filter(
                    (routing) => routing.destination !== this._definition.name
                  ),
                },
              },
            },
          });
        }
      }
    }

    cascadingChanges.push(
      ...this._definition.ingest.wired.routing.map((routing) => ({
        name: routing.destination,
        type: 'delete' as const,
      }))
    );

    return { cascadingChanges, changeStatus: 'deleted' };
  }

  protected async doValidateUpsertion(
    desiredState: State,
    startingState: State
  ): Promise<ValidationResult> {
    if (!hasSupportedStreamsRoot(this._definition.name)) {
      return {
        isValid: false,
        errors: ['Cannot create wired stream due to unsupported root stream'],
      };
    }

    const existsInStartingState = startingState.has(this._definition.name);

    if (!existsInStartingState) {
      // Check for conflicts
      try {
        const dataStreamResponse =
          await this.dependencies.scopedClusterClient.asCurrentUser.indices.getDataStream({
            name: this._definition.name,
          });

        if (dataStreamResponse.data_streams.length === 0) {
          return {
            isValid: false,
            errors: [
              `Cannot create wired stream "${this._definition.name}" due to conflict caused by existing index`,
            ],
          };
        }

        return {
          isValid: false,
          errors: [
            `Cannot create wired stream "${this._definition.name}" due to conflict caused by existing data stream`,
          ],
        };
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error;
        }
      }
    }

    // validate routing
    const children: Set<string> = new Set();
    for (const routing of this._definition.ingest.wired.routing) {
      if (children.has(routing.destination)) {
        return {
          isValid: false,
          errors: [
            `Child ${routing.destination} exists multiple times as child of ${this._definition.name}`,
          ],
        };
      }
      if (!isChildOf(this._definition.name, routing.destination)) {
        return {
          isValid: false,
          errors: [
            `The ID of child stream ${routing.destination} must start with the parent's name (${this._definition.name}), followed by a dot and a name`,
          ],
        };
      }
      children.add(routing.destination);
    }

    for (const stream of desiredState.all()) {
      if (
        !stream.isDeleted() &&
        isChildOf(this._definition.name, stream.definition.name) &&
        !children.has(stream.definition.name)
      ) {
        return {
          isValid: false,
          errors: [
            `Child stream ${stream.definition.name} is not routed to from its parent ${this._definition.name}`,
          ],
        };
      }
    }

    await this.assertNoHierarchicalConflicts(this._definition.name);

    const [ancestors, descendants] = await Promise.all([
      this.dependencies.streamsClient.getAncestors(this._definition.name),
      this.dependencies.streamsClient.getDescendants(this._definition.name),
    ]);

    validateAncestorFields({
      ancestors,
      fields: this._definition.ingest.wired.fields,
    });

    validateDescendantFields({
      descendants,
      fields: this._definition.ingest.wired.fields,
    });

    const startingStateRoot = startingState.get(this._definition.name);
    if (isRootStreamDefinition(this._definition) && startingStateRoot) {
      // only allow selective updates to a root stream
      validateRootStreamChanges(
        startingStateRoot.definition as WiredStreamDefinition,
        this._definition
      );
    }

    validateSystemFields(this._definition);

    if (this.dependencies.isServerless && isIlmLifecycle(this.getLifeCycle())) {
      return { isValid: false, errors: ['Using ILM is not supported in Serverless'] };
    }

    return { isValid: true, errors: [] };
  }

  protected async doValidateDeletion(
    desiredState: State,
    startingState: State
  ): Promise<ValidationResult> {
    return { isValid: true, errors: [] };
  }

  private async assertNoHierarchicalConflicts(definitionName: string) {
    const streamNames = [...getAncestors(definitionName), definitionName];
    const hasConflict = await Promise.all(
      streamNames.map((streamName) => this.isStreamNameTaken(streamName))
    );
    const conflicts = streamNames.filter((_val, index) => hasConflict[index]);

    if (conflicts.length !== 0) {
      throw new NameTakenError(
        `Cannot create stream "${definitionName}" due to hierarchical conflicts caused by existing unwired stream definition, index or data stream: [${conflicts.join(
          ', '
        )}]`
      );
    }
  }

  private async isStreamNameTaken(name: string): Promise<boolean> {
    try {
      const definition = await this.dependencies.streamsClient.getStream(name);
      return isUnwiredStreamDefinition(definition);
    } catch (error) {
      if (!isDefinitionNotFoundError(error)) {
        throw error;
      }
    }

    try {
      await this.dependencies.scopedClusterClient.asCurrentUser.indices.get({
        index: name,
      });

      return true;
    } catch (error) {
      if (isNotFoundError(error)) {
        return false;
      }

      throw error;
    }
  }

  protected async doDetermineCreateActions(): Promise<ElasticsearchAction[]> {
    return [
      {
        type: 'upsert_component_template',
        request: generateLayer(
          this._definition.name,
          this._definition,
          this.dependencies.isServerless
        ),
      },
      {
        type: 'upsert_ingest_pipeline',
        stream: this._definition.name,
        request: generateIngestPipeline(this._definition.name, this._definition),
      },
      {
        type: 'upsert_ingest_pipeline',
        stream: this._definition.name,
        request: generateReroutePipeline({
          definition: this._definition,
        }),
      },
      {
        type: 'upsert_index_template',
        request: generateIndexTemplate(this._definition.name, this.dependencies.isServerless),
      },
      {
        type: 'upsert_datastream',
        request: {
          name: this._definition.name,
        },
      },
      {
        type: 'update_lifecycle',
        request: {
          name: this._definition.name,
          lifecycle: this.getLifeCycle(),
        },
      },
      {
        type: 'upsert_dot_streams_document',
        request: this._definition,
      },
    ];
  }

  public hasChangedFields(): boolean {
    return this._ownFieldsChanged;
  }

  public hasChangedLifeCycle(): boolean {
    return this._lifeCycleChanged;
  }

  public getLifeCycle(): IngestStreamLifecycle {
    return this._definition.ingest.lifecycle;
  }

  protected async doDetermineUpdateActions(
    desiredState: State,
    startingState: State,
    startingStateStream: WiredStream
  ): Promise<ElasticsearchAction[]> {
    const actions: ElasticsearchAction[] = [];
    if (this.hasChangedFields() || this.hasChangedLifeCycle()) {
      actions.push({
        type: 'upsert_component_template',
        request: generateLayer(
          this._definition.name,
          this._definition,
          this.dependencies.isServerless
        ),
      });
    }
    const hasAncestorsWithChangedFields = getAncestors(this._definition.name).some((ancestor) => {
      const ancestorStream = desiredState.get(ancestor) as WiredStream | undefined;
      return ancestorStream && ancestorStream.hasChangedFields();
    });
    if (this.hasChangedFields() || hasAncestorsWithChangedFields) {
      actions.push({
        type: 'upsert_write_index_or_rollover',
        request: {
          name: this._definition.name,
        },
      });
    }
    if (this._routingChanged) {
      actions.push({
        type: 'upsert_ingest_pipeline',
        stream: this._definition.name,
        request: generateReroutePipeline({
          definition: this._definition,
        }),
      });
    }
    if (this._processingChanged) {
      actions.push({
        type: 'upsert_ingest_pipeline',
        stream: this._definition.name,
        request: generateIngestPipeline(this._definition.name, this._definition),
      });
    }
    const ancestorsAndSelf = getAncestorsAndSelf(this._definition.name).reverse();
    let hasAncestorWithChangedLifeCycle = false;
    for (const ancestor of ancestorsAndSelf) {
      const ancestorStream = desiredState.get(ancestor) as WiredStream | undefined;
      // as soon as at least one ancestor has an updated lifecycle, we need to update the lifecycle of the stream
      // once we find the ancestor actually defining the lifecycle
      if (ancestorStream && ancestorStream.hasChangedLifeCycle()) {
        hasAncestorWithChangedLifeCycle = true;
      }
      // look for the first non-inherit lifecycle, that's the one defining the effective lifecycle
      if (ancestorStream && !('inherit' in ancestorStream.getLifeCycle())) {
        if (hasAncestorWithChangedLifeCycle) {
          actions.push({
            type: 'update_lifecycle',
            request: {
              name: this._definition.name,
              lifecycle: ancestorStream.getLifeCycle(),
            },
          });
        }
        break;
      }
    }

    actions.push({
      type: 'upsert_dot_streams_document',
      request: this._definition,
    });

    return actions;
  }

  protected async doDetermineDeleteActions(): Promise<ElasticsearchAction[]> {
    return [
      {
        type: 'delete_index_template',
        request: {
          name: getIndexTemplateName(this._definition.name),
        },
      },
      {
        type: 'delete_component_template',
        request: {
          name: getComponentTemplateName(this._definition.name),
        },
      },
      {
        type: 'delete_ingest_pipeline',
        request: {
          name: getReroutePipelineName(this._definition.name),
        },
      },
      {
        type: 'delete_ingest_pipeline',
        request: {
          name: getProcessingPipelineName(this._definition.name),
        },
      },
      {
        type: 'delete_datastream',
        request: {
          name: this._definition.name,
        },
      },
      {
        type: 'delete_dot_streams_document',
        request: {
          name: this._definition.name,
        },
      },
    ];
  }
}
