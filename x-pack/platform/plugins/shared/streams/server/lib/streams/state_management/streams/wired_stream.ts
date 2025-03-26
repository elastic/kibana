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
import type { StreamChangeStatus, ValidationResult } from './stream_active_record';
import { StreamActiveRecord } from './stream_active_record';
import { hasSupportedStreamsRoot } from '../../root_stream_definition';

export class WiredStream extends StreamActiveRecord<WiredStreamDefinition> {
  constructor(definition: WiredStreamDefinition, dependencies: StateDependencies) {
    super(definition, dependencies);
  }

  clone(): StreamActiveRecord<WiredStreamDefinition> {
    return new WiredStream(cloneDeep(this.definition), this.dependencies);
  }

  private _ownFieldsChanged: boolean = false;
  private _routingChanged: boolean = false;
  private _processingChanged: boolean = false;
  private _lifeCycleChanged: boolean = false;

  protected async doHandleUpsertChange(
    definition: StreamDefinition,
    desiredState: State,
    startingState: State
  ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }> {
    if (definition.name !== this.definition.name) {
      // if the an ancestor stream gets upserted, we might need to update the stream - mark as upserted
      // so we check for updates during the Elasticsearch action planning phase.
      const ancestorHasChanged =
        isWiredStreamDefinition(definition) &&
        isDescendantOf(definition.name, this.definition.name);

      return {
        changeStatus: ancestorHasChanged ? 'upserted' : this.changeStatus,
        cascadingChanges: [],
      };
    }

    if (!isWiredStreamDefinition(definition)) {
      throw new StatusError('Cannot change stream types', 400);
    }

    this._definition = definition;

    const startingStateStreamDefinition = startingState.get(this.definition.name)?.definition;

    if (startingStateStreamDefinition && !isWiredStreamDefinition(startingStateStreamDefinition)) {
      throw new StatusError('Unexpected starting state stream type', 400);
    }

    this._ownFieldsChanged =
      !startingStateStreamDefinition ||
      !_.isEqual(
        this.definition.ingest.wired.fields,
        startingStateStreamDefinition.ingest.wired.fields
      );

    this._routingChanged =
      !startingStateStreamDefinition ||
      !_.isEqual(
        this.definition.ingest.wired.routing,
        startingStateStreamDefinition.ingest.wired.routing
      );

    this._processingChanged =
      !startingStateStreamDefinition ||
      !_.isEqual(
        this.definition.ingest.processing,
        startingStateStreamDefinition.ingest.processing
      );

    this._lifeCycleChanged =
      !startingStateStreamDefinition ||
      !_.isEqual(this.definition.ingest.lifecycle, startingStateStreamDefinition.ingest.lifecycle);

    const parentId = getParentId(this.definition.name);
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
                  destination: this.definition.name,
                  if: { never: {} },
                },
              ],
            },
          },
        },
      });
    }

    if (this._routingChanged) {
      const routeTargets = this.definition.ingest.wired.routing.map(
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
          (routing) => routing.destination === this.definition.name
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
                      destination: this.definition.name,
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
    if (target !== this.definition.name) {
      return { cascadingChanges: [], changeStatus: this.changeStatus };
    }

    const cascadingChanges: StreamChange[] = [];
    const parentId = getParentId(this.definition.name);
    if (parentId) {
      const parentStream = desiredState.get(parentId) as WiredStream;
      // if the parent hasn't changed already, ensure it has the correct routing
      // if it has changed, the routing will be updated in the parent's upsert
      if (!parentStream.hasChanged()) {
        const currentParentRouting = parentStream.definition.ingest.wired.routing;
        const hasChild = currentParentRouting.some(
          (routing) => routing.destination === this.definition.name
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
                  routing: parentStream.definition.ingest.wired.routing.filter(
                    (routing) => routing.destination !== this.definition.name
                  ),
                },
              },
            },
          });
        }
      }
    }

    cascadingChanges.push(
      ...this.definition.ingest.wired.routing.map((routing) => ({
        name: routing.destination,
        type: 'delete' as const,
      }))
    );

    return { cascadingChanges, changeStatus: 'deleted' };
  }

  protected async doValidate(desiredState: State, startingState: State): Promise<ValidationResult> {
    if (!hasSupportedStreamsRoot(this.definition.name)) {
      return {
        isValid: false,
        errors: ['Cannot create wired stream due to unsupported root stream'],
      };
    }

    const existsInStartingState = startingState.has(this.definition.name);

    if (!existsInStartingState) {
      // TODO in this check, make sure the existing data stream is not a stream-created one (if it is, state might be out of sync, but we can fix it)

      // Check for data stream conflict
      try {
        await this.dependencies.scopedClusterClient.asCurrentUser.indices.getDataStream({
          name: this.definition.name,
        });

        return {
          isValid: false,
          errors: [
            `Cannot create wired stream "${this.definition.name}" due to conflict caused by existing data stream or index`,
          ],
        };
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error;
        }
      }

      // Check for index conflict (seems covered by the above check, but why?)
      // try {
      //   await this.dependencies.scopedClusterClient.asCurrentUser.indices.get({
      //     index: this.definition.name,
      //   });

      //   return {
      //     isValid: false,
      //     errors: [
      //       `Cannot create wired stream "${this.definition.name}" due to conflict caused by existing index`,
      //     ],
      //   };
      // } catch (error) {
      //   if (!isNotFoundError(error)) {
      //     throw error;
      //   }
      // }
    }

    // validate routing
    const children: Set<string> = new Set();
    for (const routing of this.definition.ingest.wired.routing) {
      if (children.has(routing.destination)) {
        return {
          isValid: false,
          errors: [
            `Child ${routing.destination} exists multiple times as child of ${this.definition.name}`,
          ],
        };
      }
      if (!isChildOf(this.definition.name, routing.destination)) {
        return {
          isValid: false,
          errors: [
            `The ID of child stream ${routing.destination} must start with the parent's name (${this.definition.name}), followed by a dot and a name`,
          ],
        };
      }
      children.add(routing.destination);
    }

    for (const stream of desiredState.all()) {
      if (
        isChildOf(this.definition.name, stream.definition.name) &&
        !children.has(stream.definition.name)
      ) {
        return {
          isValid: false,
          errors: [
            `Child stream ${stream.definition.name} is not routed to from its parent ${this.definition.name}`,
          ],
        };
      }
    }

    await this.assertNoHierarchicalConflicts(this.definition.name);

    const [ancestors, descendants] = await Promise.all([
      this.dependencies.streamsClient.getAncestors(this.definition.name),
      this.dependencies.streamsClient.getDescendants(this.definition.name),
    ]);

    validateAncestorFields({
      ancestors,
      fields: this.definition.ingest.wired.fields,
    });

    validateDescendantFields({
      descendants,
      fields: this.definition.ingest.wired.fields,
    });

    const startingStateRoot = startingState.get(this.definition.name);
    if (isRootStreamDefinition(this.definition) && startingStateRoot) {
      // only allow selective updates to a root stream
      validateRootStreamChanges(
        startingStateRoot.definition as WiredStreamDefinition,
        this.definition
      );
    }

    validateSystemFields(this.definition);

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
          this.definition.name,
          this.definition,
          this.dependencies.isServerless
        ),
      },
      {
        type: 'upsert_ingest_pipeline',
        stream: this.definition.name,
        request: generateIngestPipeline(this.definition.name, this.definition),
      },
      {
        type: 'upsert_ingest_pipeline',
        stream: this.definition.name,
        request: generateReroutePipeline({
          definition: this.definition,
        }),
      },
      {
        type: 'upsert_index_template',
        request: generateIndexTemplate(this.definition.name, this.dependencies.isServerless),
      },
      {
        type: 'upsert_datastream',
        request: {
          name: this.definition.name,
        },
      },
      {
        type: 'update_lifecycle',
        request: {
          name: this.definition.name,
          lifecycle: this.getLifeCycle(),
        },
      },
      {
        type: 'upsert_dot_streams_document',
        request: this.definition,
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
    return this.definition.ingest.lifecycle;
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
          this.definition.name,
          this.definition,
          this.dependencies.isServerless
        ),
      });
    }
    const hasAncestorsWithChangedFields = getAncestors(this.definition.name).some((ancestor) => {
      const ancestorStream = desiredState.get(ancestor) as WiredStream | undefined;
      return ancestorStream && ancestorStream.hasChangedFields();
    });
    if (this.hasChangedFields() || hasAncestorsWithChangedFields) {
      actions.push({
        type: 'upsert_write_index_or_rollover',
        request: {
          name: this.definition.name,
        },
      });
    }
    if (this._routingChanged) {
      actions.push({
        type: 'upsert_ingest_pipeline',
        stream: this.definition.name,
        request: generateReroutePipeline({
          definition: this.definition,
        }),
      });
    }
    if (this._processingChanged) {
      actions.push({
        type: 'upsert_ingest_pipeline',
        stream: this.definition.name,
        request: generateIngestPipeline(this.definition.name, this.definition),
      });
    }
    const ancestorsAndSelf = getAncestorsAndSelf(this.definition.name).reverse();
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
              name: this.definition.name,
              lifecycle: ancestorStream.getLifeCycle(),
            },
          });
        }
        break;
      }
    }

    actions.push({
      type: 'upsert_dot_streams_document',
      request: this.definition,
    });

    return actions;
  }

  protected async doDetermineDeleteActions(): Promise<ElasticsearchAction[]> {
    return [
      {
        type: 'delete_index_template',
        request: {
          name: getIndexTemplateName(this.definition.name),
        },
      },
      {
        type: 'delete_component_template',
        request: {
          name: getComponentTemplateName(this.definition.name),
        },
      },
      {
        type: 'delete_ingest_pipeline',
        request: {
          name: getReroutePipelineName(this.definition.name),
        },
      },
      {
        type: 'delete_ingest_pipeline',
        request: {
          name: getProcessingPipelineName(this.definition.name),
        },
      },
      {
        type: 'delete_datastream',
        request: {
          name: this.definition.name,
        },
      },
      {
        type: 'delete_dot_streams_document',
        request: {
          name: this.definition.name,
        },
      },
    ];
  }
}
