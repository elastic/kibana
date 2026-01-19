/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isNotFoundError } from '@kbn/es-errors';
import type { IngestStreamLifecycle } from '@kbn/streams-schema';
import {
  MAX_NESTING_LEVEL,
  Streams,
  findInheritedLifecycle,
  getInheritedSettings,
  getSegments,
  isInheritLifecycle,
  getInheritedFieldsFromAncestors,
} from '@kbn/streams-schema';
import {
  getAncestors,
  getAncestorsAndSelf,
  getParentId,
  isChildOf,
  isDescendantOf,
  isRootStreamDefinition,
  isIlmLifecycle,
} from '@kbn/streams-schema';
import _, { cloneDeep } from 'lodash';
import type { FailureStore } from '@kbn/streams-schema/src/models/ingest/failure_store';
import {
  isDisabledLifecycleFailureStore,
  isInheritFailureStore,
} from '@kbn/streams-schema/src/models/ingest/failure_store';
import { validateStreamlang } from '@kbn/streamlang';
import { MAX_STREAM_NAME_LENGTH } from '../../../../../common/constants';
import { generateLayer } from '../../component_templates/generate_layer';
import { getComponentTemplateName } from '../../component_templates/name';
import { isDefinitionNotFoundError } from '../../errors/definition_not_found_error';
import { NameTakenError } from '../../errors/name_taken_error';
import { StatusError } from '../../errors/status_error';
import {
  validateAncestorFields,
  validateDescendantFields,
  validateSimulation,
  validateSystemFields,
} from '../../helpers/validate_fields';
import {
  validateRootStreamChanges,
  validateBracketsInFieldNames,
} from '../../helpers/validate_stream';
import { generateIndexTemplate } from '../../index_templates/generate_index_template';
import { getIndexTemplateName } from '../../index_templates/name';
import { generateIngestPipeline } from '../../ingest_pipelines/generate_ingest_pipeline';
import { generateReroutePipeline } from '../../ingest_pipelines/generate_reroute_pipeline';
import { getProcessingPipelineName, getReroutePipelineName } from '../../ingest_pipelines/name';
import type { ElasticsearchAction } from '../execution_plan/types';
import type { State } from '../state';
import type { StateDependencies, StreamChange } from '../types';
import type {
  StreamChangeStatus,
  StreamChanges,
  ValidationResult,
} from '../stream_active_record/stream_active_record';
import { StreamActiveRecord } from '../stream_active_record/stream_active_record';
import { hasSupportedStreamsRoot } from '../../root_stream_definition';
import { formatSettings, settingsUpdateRequiresRollover } from './helpers';
import { validateSettings, validateSettingsWithDryRun } from './validate_settings';

interface WiredStreamChanges extends StreamChanges {
  ownFields: boolean;
  routing: boolean;
  processing: boolean;
  failure_store: boolean;
  lifecycle: boolean;
  settings: boolean;
}

export class WiredStream extends StreamActiveRecord<Streams.WiredStream.Definition> {
  protected _changes: WiredStreamChanges = {
    ownFields: false,
    routing: false,
    processing: false,
    lifecycle: false,
    failure_store: false,
    settings: false,
  };

  constructor(definition: Streams.WiredStream.Definition, dependencies: StateDependencies) {
    super(definition, dependencies);
  }

  protected doClone(): StreamActiveRecord<Streams.WiredStream.Definition> {
    return new WiredStream(cloneDeep(this._definition), this.dependencies);
  }

  protected async doHandleUpsertChange(
    definition: Streams.all.Definition,
    desiredState: State,
    startingState: State
  ): Promise<{ cascadingChanges: StreamChange[]; changeStatus: StreamChangeStatus }> {
    if (definition.name !== this._definition.name) {
      // if the an ancestor stream gets upserted, we might need to update the stream - mark as upserted
      // so we check for updates during the Elasticsearch action planning phase.
      const ancestorHasChanged =
        Streams.WiredStream.Definition.is(definition) &&
        isDescendantOf(definition.name, this._definition.name);

      return {
        changeStatus: ancestorHasChanged && !this.isDeleted() ? 'upserted' : this.changeStatus,
        cascadingChanges: [],
      };
    }

    if (!Streams.WiredStream.Definition.is(definition)) {
      throw new StatusError('Cannot change stream types', 400);
    }

    this._definition = definition;

    const startingStateStreamDefinition = startingState.get(this._definition.name)?.definition;

    if (
      startingStateStreamDefinition &&
      !Streams.WiredStream.Definition.is(startingStateStreamDefinition)
    ) {
      throw new StatusError('Unexpected starting state stream type', 400);
    }

    this._changes.ownFields =
      !startingStateStreamDefinition ||
      !_.isEqual(
        this._definition.ingest.wired.fields,
        startingStateStreamDefinition.ingest.wired.fields
      );

    this._changes.routing =
      !startingStateStreamDefinition ||
      !_.isEqual(
        this._definition.ingest.wired.routing,
        startingStateStreamDefinition.ingest.wired.routing
      );

    this._changes.failure_store =
      !startingStateStreamDefinition ||
      !_.isEqual(
        this._definition.ingest.failure_store,
        startingStateStreamDefinition.ingest.failure_store
      );

    this._changes.processing =
      !startingStateStreamDefinition ||
      !_.isEqual(
        _.omit(this._definition.ingest.processing, ['updated_at']),
        _.omit(startingStateStreamDefinition.ingest.processing, ['updated_at'])
      );

    this._changes.lifecycle =
      !startingStateStreamDefinition ||
      !_.isEqual(this._definition.ingest.lifecycle, startingStateStreamDefinition.ingest.lifecycle);

    this._changes.settings =
      !startingStateStreamDefinition ||
      !_.isEqual(this._definition.ingest.settings, startingStateStreamDefinition.ingest.settings);

    // The newly upserted definition will always have a new updated_at timestamp. But, if processing didn't change,
    // we should keep the existing updated_at as processing wasn't touched.
    if (startingStateStreamDefinition && !this._changes.processing) {
      this._definition.ingest.processing.updated_at =
        startingStateStreamDefinition.ingest.processing.updated_at;
    }

    const parentId = getParentId(this._definition.name);
    const cascadingChanges: StreamChange[] = [];
    const now = new Date().toISOString();

    if (parentId && !desiredState.has(parentId)) {
      cascadingChanges.push({
        type: 'upsert',
        definition: {
          name: parentId,
          description: '',
          updated_at: now,
          ingest: {
            lifecycle: { inherit: {} },
            processing: { steps: [], updated_at: now },
            settings: {},
            wired: {
              fields: {},
              routing: [
                {
                  destination: this._definition.name,
                  where: { never: {} },
                  status: 'disabled',
                },
              ],
            },
            failure_store: { inherit: {} },
          },
        },
      });
    }

    if (this._changes.routing) {
      const routeTargets = this._definition.ingest.wired.routing.map(
        (routing) => routing.destination
      );

      for (const routeTarget of routeTargets) {
        if (!desiredState.has(routeTarget)) {
          cascadingChanges.push({
            type: 'upsert',
            definition: {
              name: routeTarget,
              description: '',
              updated_at: now,
              ingest: {
                lifecycle: { inherit: {} },
                processing: { steps: [], updated_at: now },
                settings: {},
                wired: {
                  fields: {},
                  routing: [],
                },
                failure_store: { inherit: {} },
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
              description: '',
              updated_at: now,
              ingest: {
                ...parentStream.definition.ingest,
                wired: {
                  ...parentStream.definition.ingest.wired,
                  routing: [
                    ...currentParentRouting,
                    {
                      destination: this._definition.name,
                      where: { never: {} },
                      status: 'disabled',
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
              description: '',
              updated_at: new Date().toISOString(),
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
        errors: [new Error('Cannot create wired stream due to unsupported root stream')],
      };
    }

    const nestingLevel = getSegments(this._definition.name).length;

    if (nestingLevel > MAX_NESTING_LEVEL) {
      return {
        isValid: false,
        errors: [
          new Error(
            `Cannot create wired stream "${this._definition.name}" due to nesting level exceeding ${MAX_NESTING_LEVEL}`
          ),
        ],
      };
    }

    const existsInStartingState = startingState.has(this._definition.name);

    if (!existsInStartingState) {
      // Check for conflicts
      const { existsAsIndex, existsAsManagedDataStream, existsAsDataStream } =
        await this.getMatchingDataStream();
      if (existsAsIndex) {
        return {
          isValid: false,
          errors: [
            new Error(
              `Cannot create wired stream "${this._definition.name}" due to conflict caused by existing index`
            ),
          ],
        };
      }
      if (existsAsDataStream && !existsAsManagedDataStream) {
        // if the data stream exists, but is not managed by streams, we cannot create a wired stream with the same name
        return {
          isValid: false,
          errors: [
            new Error(
              `Cannot create wired stream "${this._definition.name}" due to conflict caused by existing data stream`
            ),
          ],
        };
      }
    }

    getAncestors(this._definition.name).forEach((name) => {
      const ancestor = desiredState.get(name);
      if (!ancestor) {
        throw new Error(`ancestor ${name} not found is desired state`);
      }
    });

    // validate routing
    const children: Set<string> = new Set();
    const prefix = this.definition.name + '.';
    for (const routing of this._definition.ingest.wired.routing) {
      const hasUpperCaseChars = routing.destination !== routing.destination.toLowerCase();
      if (hasUpperCaseChars) {
        return {
          isValid: false,
          errors: [new Error(`Stream name cannot contain uppercase characters.`)],
        };
      }
      if (routing.destination.length <= prefix.length) {
        return {
          isValid: false,
          errors: [new Error(`Stream name must not be empty.`)],
        };
      }
      if (routing.destination.length > MAX_STREAM_NAME_LENGTH) {
        return {
          isValid: false,
          errors: [
            new Error(`Stream name cannot be longer than ${MAX_STREAM_NAME_LENGTH} characters.`),
          ],
        };
      }
      if (children.has(routing.destination)) {
        return {
          isValid: false,
          errors: [
            new Error(
              `Child ${routing.destination} exists multiple times as child of ${this._definition.name}`
            ),
          ],
        };
      }
      if (!isChildOf(this._definition.name, routing.destination)) {
        return {
          isValid: false,
          errors: [
            new Error(
              `The ID of child stream ${routing.destination} must start with the parent's name (${this._definition.name}), followed by a dot and a name`
            ),
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
            new Error(
              `Child stream ${stream.definition.name} is not routed to from its parent ${this._definition.name}`
            ),
          ],
        };
      }
    }

    if (!existsInStartingState) {
      await this.assertNoHierarchicalConflicts(this._definition.name);
    }

    const ancestors = desiredState
      .all()
      .filter((stream) => {
        return isDescendantOf(stream.definition.name, this._definition.name);
      })
      .map((stream) => stream.definition as Streams.WiredStream.Definition);

    const descendants = desiredState
      .all()
      .filter((stream) => {
        return isDescendantOf(this._definition.name, stream.definition.name);
      })
      .map((stream) => stream.definition as Streams.WiredStream.Definition);

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
      Streams.WiredStream.Definition.asserts(startingStateRoot.definition);
      validateRootStreamChanges(startingStateRoot.definition, this._definition);
    }

    validateSystemFields(this._definition);
    validateBracketsInFieldNames(this._definition);

    // Validate Streamlang processing
    if (this._definition.ingest.processing.steps.length > 0) {
      // Collect all fields (own fields + inherited fields from ancestors)
      const allFields = {
        ...this._definition.ingest.wired.fields,
        ...getInheritedFieldsFromAncestors(ancestors),
      };

      // Extract reserved field names (fields marked as 'system')
      const reservedFields = Object.entries(allFields)
        .filter(([, { type }]) => type === 'system')
        .map(([name]) => name);

      // Validate the Streamlang DSL
      const validationResult = validateStreamlang(this._definition.ingest.processing, {
        reservedFields,
      });

      if (!validationResult.isValid) {
        return {
          isValid: false,
          errors: validationResult.errors.map(
            (error) => new Error(`${error.message} (field: ${error.field})`)
          ),
        };
      }
    }
    const effectiveFailureStore = this.getInheritedFailureStoreFromAncestors(ancestors);

    if (this.dependencies.isServerless) {
      if (isIlmLifecycle(this.getLifecycle())) {
        return { isValid: false, errors: [new Error('Using ILM is not supported in Serverless')] };
      }
      if (isDisabledLifecycleFailureStore(effectiveFailureStore)) {
        return {
          isValid: false,
          errors: [new Error('Disabling failure store lifecycle is not supported in Serverless')],
        };
      }
    }

    const ancestorsAndSelf = getAncestorsAndSelf(this._definition.name).map(
      (id) => desiredState.get(id)!
    ) as WiredStream[];

    const inheritedSettings = getInheritedSettings(
      ancestorsAndSelf.map((ancestor) => ancestor.definition) as Streams.WiredStream.Definition[]
    );

    const allowlistValidation = validateSettings({
      settings: inheritedSettings,
      isServerless: this.dependencies.isServerless,
    });

    if (!allowlistValidation.isValid) {
      return allowlistValidation;
    }

    const shouldValidateSettingsWithDryRun =
      existsInStartingState && ancestorsAndSelf.some((ancestor) => ancestor.hasChangedSettings());

    await Promise.all([
      shouldValidateSettingsWithDryRun
        ? validateSettingsWithDryRun({
            scopedClusterClient: this.dependencies.scopedClusterClient,
            streamName: this._definition.name,
            settings: inheritedSettings,
            isServerless: this.dependencies.isServerless,
          })
        : Promise.resolve(),
      validateSimulation(this._definition, this.dependencies.scopedClusterClient),
    ]);

    return { isValid: true, errors: [] };
  }

  private async getMatchingDataStream() {
    try {
      const response =
        await this.dependencies.scopedClusterClient.asCurrentUser.indices.getDataStream({
          name: this._definition.name,
        });

      if (response.data_streams.length === 0) {
        // the request didn't throw an error, but the data stream doesn't exist
        // this means that the stream exists as an index, but not as a managed data stream
        return { existsAsIndex: true, existsAsManagedDataStream: false };
      }

      const existsAsManagedDataStream =
        response.data_streams.length === 1 &&
        response.data_streams[0]._meta?.managed_by === 'streams';

      const existsAsDataStream = response.data_streams.length > 0;

      return { existsAsIndex: false, existsAsManagedDataStream, existsAsDataStream };
    } catch (error) {
      if (!isNotFoundError(error)) {
        throw error;
      }
      // not found error means that the data stream doesn't exist at all
      return { existsAsIndex: false, existsAsManagedDataStream: false, existsAsDataStream: false };
    }
  }

  protected async doValidateDeletion(
    desiredState: State,
    startingState: State
  ): Promise<ValidationResult> {
    return { isValid: true, errors: [] };
  }

  private async assertNoHierarchicalConflicts(definitionName: string) {
    const streamNames = getAncestors(definitionName);
    const hasConflict = await Promise.all(
      streamNames.map((streamName) => this.isStreamNameTaken(streamName))
    );
    const conflicts = streamNames.filter((_val, index) => hasConflict[index]);

    if (conflicts.length !== 0) {
      throw new NameTakenError(
        `Cannot create stream "${definitionName}" due to hierarchical conflicts caused by existing classic stream definition, index or data stream: [${conflicts.join(
          ', '
        )}]`
      );
    }
  }

  private async isStreamNameTaken(name: string): Promise<boolean> {
    try {
      const definition = await this.dependencies.streamsClient.getStream(name);
      return Streams.ClassicStream.Definition.is(definition);
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

  protected async doDetermineCreateActions(desiredState: State): Promise<ElasticsearchAction[]> {
    const ancestors = getAncestorsAndSelf(this._definition.name).map(
      (id) => desiredState.get(id)!.definition as Streams.WiredStream.Definition
    );
    const { from: _lifecycleOrigin, ...lifecycle } = findInheritedLifecycle(
      this._definition,
      ancestors
    );
    const { existsAsManagedDataStream } = await this.getMatchingDataStream();
    const settings = getInheritedSettings(ancestors);
    const failureStore = this.getInheritedFailureStoreFromAncestors(ancestors);

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
        request: generateIndexTemplate(this._definition.name),
      },
      existsAsManagedDataStream
        ? {
            type: 'rollover',
            request: {
              name: this._definition.name,
            },
          }
        : {
            type: 'upsert_datastream',
            request: {
              name: this._definition.name,
            },
          },
      {
        type: 'update_lifecycle',
        request: {
          name: this._definition.name,
          lifecycle,
        },
      },
      {
        type: 'update_ingest_settings',
        request: {
          name: this._definition.name,
          settings: formatSettings(settings, this.dependencies.isServerless),
        },
      },
      {
        type: 'update_failure_store',
        request: {
          name: this._definition.name,
          failure_store: failureStore,
          definition: this._definition,
        },
      },
      {
        type: 'upsert_dot_streams_document',
        request: this._definition,
      },
    ];
  }

  public hasChangedFields(): boolean {
    return this._changes.ownFields;
  }

  public hasChangedLifecycle(): boolean {
    return this._changes.lifecycle;
  }

  public hasChangedFailureStore(): boolean {
    return this._changes.failure_store;
  }

  public hasChangedSettings(): boolean {
    return this._changes.settings;
  }

  public getLifecycle(): IngestStreamLifecycle {
    return this._definition.ingest.lifecycle;
  }

  public getFailureStore(): FailureStore {
    return this._definition.ingest.failure_store;
  }

  private getInheritedFailureStoreFromAncestors(
    ancestors: Streams.WiredStream.Definition[]
  ): FailureStore {
    const ancestorsAndSelf = [...ancestors, this._definition].reverse();

    for (const ancestor of ancestorsAndSelf) {
      if (!ancestor) {
        throw new Error(`Failed to resolve failure store for stream ${this._definition.name}`);
      }

      const ancestorFailureStore = ancestor.ingest.failure_store;
      if (!isInheritFailureStore(ancestorFailureStore)) {
        return ancestorFailureStore;
      }
    }
    throw new Error(
      `Failed to resolve failure store for stream ${this._definition.name}: all ancestors have inherit configuration`
    );
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
          this._definition.name,
          this._definition,
          this.dependencies.isServerless
        ),
      });
    }
    const hasAncestorsWithChangedFields = getAncestors(this._definition.name).some((ancestor) => {
      const ancestorStream = desiredState.get(ancestor)! as WiredStream;
      return ancestorStream.hasChangedFields();
    });
    if (this.hasChangedFields() || hasAncestorsWithChangedFields) {
      actions.push({
        type: 'rollover',
        request: {
          name: this._definition.name,
        },
      });
    }

    if (this._changes.routing) {
      actions.push({
        type: 'upsert_ingest_pipeline',
        stream: this._definition.name,
        request: generateReroutePipeline({
          definition: this._definition,
        }),
      });
    }
    if (this._changes.processing) {
      actions.push({
        type: 'upsert_ingest_pipeline',
        stream: this._definition.name,
        request: generateIngestPipeline(this._definition.name, this._definition),
      });
    }
    const ancestorsAndSelf = getAncestorsAndSelf(this._definition.name).reverse();

    const checkAncestorChangesAndUpdate = <T>({
      hasChanged,
      getValue,
      isInherit,
      createAction,
    }: {
      hasChanged: (stream: WiredStream) => boolean;
      getValue: (stream: WiredStream) => T;
      isInherit: (value: T) => boolean;
      createAction: (value: T) => ElasticsearchAction;
    }) => {
      let hasAncestorChanged = false;
      for (const ancestor of ancestorsAndSelf) {
        const ancestorStream = desiredState.get(ancestor)! as WiredStream;
        // as soon as at least one ancestor has an updated setting, we need to update the lifecycle of the stream
        // once we find the ancestor actually defining the setting
        if (hasChanged(ancestorStream)) {
          hasAncestorChanged = true;
        }
        const value = getValue(ancestorStream);
        // look for the first non-inherit value, that's the one defining the effective setting
        if (!isInherit(value)) {
          if (hasAncestorChanged) {
            actions.push(createAction(value));
          }
          break;
        }
      }
    };

    // Lifecycle
    checkAncestorChangesAndUpdate({
      hasChanged: (stream: WiredStream) => stream.hasChangedLifecycle(),
      getValue: (stream: WiredStream) => stream.getLifecycle(),
      isInherit: isInheritLifecycle,
      createAction: (lifecycle: IngestStreamLifecycle) => ({
        type: 'update_lifecycle',
        request: {
          name: this._definition.name,
          lifecycle,
        },
      }),
    });

    // Failure store
    checkAncestorChangesAndUpdate({
      hasChanged: (stream: WiredStream) => stream.hasChangedFailureStore(),
      getValue: (stream: WiredStream) => stream.getFailureStore(),
      isInherit: isInheritFailureStore,
      createAction: (failureStore: FailureStore) => ({
        type: 'update_failure_store',
        request: {
          name: this._definition.name,
          failure_store: failureStore,
          definition: this._definition,
        },
      }),
    });

    const ancestors = getAncestorsAndSelf(this._definition.name).map(
      (id) => desiredState.get(id)!
    ) as WiredStream[];
    if (ancestors.some((ancestor) => ancestor.hasChangedSettings())) {
      const settings = getInheritedSettings(
        ancestors.map((ancestor) => ancestor.definition) as Streams.WiredStream.Definition[]
      );

      actions.push({
        type: 'update_ingest_settings',
        request: {
          name: this._definition.name,
          settings: formatSettings(settings, this.dependencies.isServerless),
        },
      });

      const oldSettings = getInheritedSettings(
        getAncestorsAndSelf(this._definition.name).map(
          (id) => startingState.get(id)!.definition
        ) as Streams.WiredStream.Definition[]
      );
      if (settingsUpdateRequiresRollover(oldSettings, settings)) {
        actions.push({
          type: 'rollover',
          request: { name: this._definition.name },
        });
      }
    }

    const definitionChanged = !_.isEqual(startingStateStream.definition, this._definition);
    if (definitionChanged) {
      actions.push({
        type: 'upsert_dot_streams_document',
        request: this._definition,
      });
    }

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
      {
        type: 'delete_queries',
        request: {
          name: this._definition.name,
        },
      },
      {
        type: 'unlink_assets',
        request: {
          name: this._definition.name,
        },
      },
      {
        type: 'unlink_systems',
        request: {
          name: this._definition.name,
        },
      },
      {
        type: 'unlink_features',
        request: {
          name: this._definition.name,
        },
      },
    ];
  }
}
