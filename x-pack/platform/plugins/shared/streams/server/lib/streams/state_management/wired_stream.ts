/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  IngestStreamLifecycle,
  StreamDefinition,
  WiredStreamDefinition,
  getAncestors,
  getAncestorsAndSelf,
  getParentId,
  isChildOf,
  isDescendantOf,
  isRootStreamDefinition,
  isUnwiredStreamDefinition,
  isWiredStreamDefinition,
} from '@kbn/streams-schema';
import { cloneDeep } from 'lodash';
import { isNotFoundError, isResponseError } from '@kbn/es-errors';
import _ from 'lodash';
import { State, StreamChange } from './state';
import { StreamActiveRecord, ValidationResult, StreamDependencies } from './stream_active_record';
import { ElasticsearchAction } from './execution_plan';
import { generateIndexTemplate } from '../index_templates/generate_index_template';
import { generateLayer } from '../component_templates/generate_layer';
import { generateIngestPipeline } from '../ingest_pipelines/generate_ingest_pipeline';
import { generateReroutePipeline } from '../ingest_pipelines/generate_reroute_pipeline';
import { getProcessingPipelineName, getReroutePipelineName } from '../ingest_pipelines/name';
import { getComponentTemplateName } from '../component_templates/name';
import { getIndexTemplateName } from '../index_templates/name';
import { NameTakenError } from '../errors/name_taken_error';
import { isDefinitionNotFoundError } from '../errors/definition_not_found_error';
import { validateAncestorFields, validateDescendantFields } from '../helpers/validate_fields';
import { validateRootStreamChanges } from '../helpers/validate_stream';

export class WiredStream extends StreamActiveRecord<WiredStreamDefinition> {
  constructor(definition: WiredStreamDefinition, dependencies: StreamDependencies) {
    super(definition, dependencies);
    // What about the assets?
  }

  clone(): StreamActiveRecord<WiredStreamDefinition> {
    return new WiredStream(cloneDeep(this._updated_definition), this.dependencies);
  }

  private _ownFieldsChanged: boolean = false;
  private _routingChanged: boolean = false;
  private _processingChanged: boolean = false;
  private _lifeCycleChanged: boolean = false;

  protected async doUpsert(
    definition: StreamDefinition,
    desiredState: State,
    startingState: State
  ): Promise<StreamChange[]> {
    if (definition.name !== this.definition.name) {
      if (
        isWiredStreamDefinition(definition) &&
        isDescendantOf(definition.name, this.definition.name)
      ) {
        // if the an ancestor stream gets upserted, we might need to update the stream - mark as upserted
        // so we check for updates during the Elasticsearch action planning phase.
        this.changeStatus = 'upserted';
      }

      return [];
    }
    if (!isWiredStreamDefinition(definition)) {
      throw new Error('Cannot change stream types');
    }

    this._updated_definition = definition;
    this.changeStatus = 'upserted';

    const startingStateStreamDefinition = startingState.get(this.definition.name)?.definition;

    if (startingStateStreamDefinition && !isWiredStreamDefinition(startingStateStreamDefinition)) {
      throw new Error('Unexpected starting state stream type');
    }

    this._ownFieldsChanged =
      !startingStateStreamDefinition ||
      !_.isEqual(
        this._updated_definition.ingest.wired.fields,
        startingStateStreamDefinition.ingest.wired.fields
      );

    this._routingChanged =
      !startingStateStreamDefinition ||
      !_.isEqual(
        this._updated_definition.ingest.routing,
        startingStateStreamDefinition.ingest.routing
      );

    this._processingChanged =
      !startingStateStreamDefinition ||
      !_.isEqual(
        this._updated_definition.ingest.processing,
        startingStateStreamDefinition.ingest.processing
      );

    this._lifeCycleChanged =
      !startingStateStreamDefinition ||
      !_.isEqual(
        this._updated_definition.ingest.lifecycle,
        startingStateStreamDefinition.ingest.lifecycle
      );

    const parentId = getParentId(this._updated_definition.name);
    const cascadingChanges: StreamChange[] = [];
    if (parentId && !desiredState.has(parentId)) {
      cascadingChanges.push({
        target: parentId,
        type: 'wired_upsert',
        request: {
          dashboards: [],
          stream: {
            name: parentId,
            ingest: {
              lifecycle: { inherit: {} },
              processing: [],
              routing: [
                {
                  destination: this._updated_definition.name,
                  if: { never: {} },
                },
              ],
              wired: {
                fields: {},
              },
            },
          },
        },
      });
    }
    if (parentId && desiredState.has(parentId)) {
      const parentStream = desiredState.get(parentId) as WiredStream;
      // if the parent hasn't changed already, ensure it has the correct routing
      // if it has changed, the routing will be updated in the parent's upsert
      if (!parentStream.hasChanged()) {
        const currentParentRouting = parentStream.definition.ingest.routing;
        const hasChild = currentParentRouting.some(
          (routing) => routing.destination === this._updated_definition.name
        );
        if (!hasChild) {
          cascadingChanges.push({
            target: parentId,
            type: 'wired_upsert',
            request: {
              dashboards: [],
              stream: {
                name: parentId,
                ingest: {
                  ...parentStream.definition.ingest,
                  routing: [
                    ...currentParentRouting,
                    {
                      destination: this._updated_definition.name,
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

    return cascadingChanges;
  }

  protected async doDelete(
    target: string,
    desiredState: State,
    startingState: State
  ): Promise<StreamChange[]> {
    if (target !== this.definition.name) {
      return [];
    }
    this.changeStatus = 'deleted';
    const cascadingChanges: StreamChange[] = [];
    const parentId = getParentId(this._updated_definition.name);
    if (parentId) {
      const parentStream = desiredState.get(parentId) as WiredStream;
      // if the parent hasn't changed already, ensure it has the correct routing
      // if it has changed, the routing will be updated in the parent's upsert
      if (!parentStream.hasChanged()) {
        const currentParentRouting = parentStream.definition.ingest.routing;
        const hasChild = currentParentRouting.some(
          (routing) => routing.destination === this._updated_definition.name
        );
        if (!hasChild) {
          cascadingChanges.push({
            target: parentId,
            type: 'wired_upsert',
            request: {
              dashboards: [],
              stream: {
                name: parentId,
                ingest: {
                  ...parentStream.definition.ingest,
                  routing: parentStream.definition.ingest.routing.filter(
                    (routing) => routing.destination !== this._updated_definition.name
                  ),
                },
              },
            },
          });
        }
      }
    }

    cascadingChanges.push(
      ...this.definition.ingest.routing.map((routing) => ({
        target: routing.destination,
        type: 'delete' as const,
      }))
    );

    return cascadingChanges;
  }

  protected async doValidate(desiredState: State, startingState: State): Promise<ValidationResult> {
    const existsInStartingState = startingState.has(this.definition.name);

    if (!existsInStartingState) {
      // TODO in this check, make sure the existing data stream is not a stream-created one (if it is, state might be out of sync, but we can fix it)
      // Check for data stream conflict
      const dataStreamResult =
        await this.dependencies.scopedClusterClient.asCurrentUser.indices.getDataStream({
          name: this.definition.name,
        });

      if (dataStreamResult.data_streams.length !== 0) {
        return {
          isValid: false,
          errors: [
            `Cannot create wired stream "${this.definition.name}" due to conflict caused by existing data stream`,
          ],
        };
      }

      // Check for index conflict
      await this.dependencies.scopedClusterClient.asCurrentUser.indices
        .get({
          index: this.definition.name,
        })
        .catch((error) => {
          if (!(isResponseError(error) && error.statusCode === 404)) {
            throw error;
          }
        });

      return {
        isValid: false,
        errors: [
          `Cannot create wired stream "${this.definition.name}" due to conflict caused by existing index`,
        ],
      };
    }

    // validate routing
    const children: Set<string> = new Set();
    for (const routing of this._updated_definition.ingest.routing) {
      if (children.has(routing.destination)) {
        return {
          isValid: false,
          errors: [
            `Child ${routing.destination} exists multiple times as child of ${this.definition.name}`,
          ],
        };
      }
      if (!isChildOf(this._updated_definition.name, routing.destination)) {
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
        isChildOf(this._updated_definition.name, stream.definition.name) &&
        !children.has(stream.definition.name)
      ) {
        return {
          isValid: false,
          errors: [
            `Child stream ${stream.definition.name} is not routed to from its parent ${this._updated_definition.name}`,
          ],
        };
      }
    }

    await this.assertNoHierarchicalConflicts(this._updated_definition.name);

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

    if (isRootStreamDefinition(this.definition)) {
      // only allow selective updates to a root stream
      validateRootStreamChanges(this.definition, this._updated_definition);
    }

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
          this._updated_definition.name,
          this._updated_definition,
          this.dependencies.isServerless
        ),
      },
      {
        type: 'upsert_ingest_pipeline',
        stream: this.definition.name,
        request: generateIngestPipeline(this._updated_definition.name, this._updated_definition),
      },
      {
        type: 'upsert_ingest_pipeline',
        stream: this.definition.name,
        request: generateReroutePipeline({
          definition: this._updated_definition,
        }),
      },
      {
        type: 'upsert_index_template',
        request: generateIndexTemplate(
          this._updated_definition.name,
          this.dependencies.isServerless
        ),
      },
      {
        type: 'upsert_datastream',
        request: {
          name: this._updated_definition.name,
        },
      },
      {
        type: 'upsert_dot_streams_document',
        request: this._updated_definition,
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
    return this._updated_definition.ingest.lifecycle;
  }

  protected async doDetermineUpdateActions(
    desiredState: State,
    startingState: State,
    startingStateStream: WiredStream
  ): Promise<ElasticsearchAction[]> {
    const actions: ElasticsearchAction[] = [];
    if (this.hasChangedFields()) {
      actions.push({
        type: 'upsert_component_template',
        request: generateLayer(
          this._updated_definition.name,
          this._updated_definition,
          this.dependencies.isServerless
        ),
      });
    }
    const hasAncestorsWithChangedFields = getAncestors(this._updated_definition.name).some(
      (ancestor) => {
        const ancestorStream = desiredState.get(ancestor) as WiredStream | undefined;
        return ancestorStream && ancestorStream.hasChangedFields();
      }
    );
    if (this.hasChangedFields() || hasAncestorsWithChangedFields) {
      actions.push({
        type: 'upsert_write_index_or_rollover',
        request: {
          name: this._updated_definition.name,
        },
      });
    }
    if (this._routingChanged) {
      actions.push({
        type: 'upsert_ingest_pipeline',
        stream: this.definition.name,
        request: generateReroutePipeline({
          definition: this._updated_definition,
        }),
      });
    }
    if (this._processingChanged) {
      actions.push({
        type: 'upsert_ingest_pipeline',
        stream: this.definition.name,
        request: generateIngestPipeline(this._updated_definition.name, this._updated_definition),
      });
    }
    const ancestorsAndSelf = getAncestorsAndSelf(this._updated_definition.name).reverse();
    let hasAncestorWithChangedLifeCycle = false;
    for (const ancestor of ancestorsAndSelf) {
      const ancestorStream = desiredState.get(ancestor) as WiredStream | undefined;
      // as soon as at least one ancestor has an updated lifecycle, we need to update the lifecycle of the stream
      // once we find the ancestor actually defining the lifecycle
      if (ancestorStream && ancestorStream.hasChangedLifeCycle()) {
        hasAncestorWithChangedLifeCycle = true;
      }
      // look for the first non-inherit lifecycle, that's the obe defibing the effective lifecycle
      if (ancestorStream && !('inherit' in ancestorStream.getLifeCycle())) {
        if (hasAncestorWithChangedLifeCycle) {
          actions.push({
            type: 'update_lifecycle',
            request: {
              name: this._updated_definition.name,
              lifecycle: ancestorStream.getLifeCycle(),
            },
          });
        }
        break;
      }
    }

    actions.push({
      type: 'upsert_dot_streams_document',
      request: this._updated_definition,
    });

    // TODO get assets into this

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
          name: this._updated_definition.name,
        },
      },
      {
        type: 'delete_dot_streams_document',
        request: {
          name: this._updated_definition.name,
        },
      },
      {
        type: 'sync_asset_list',
        request: {
          name: this._updated_definition.name,
          assetIds: [],
        },
      },
    ];
  }
}
