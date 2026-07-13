/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq, difference } from 'lodash';
import type { PublicMethodsOf } from '@kbn/utility-types';
import type {
  SavedObjectsClientContract,
  ISavedObjectTypeRegistry,
  KibanaRequest,
} from '@kbn/core/server';
import type { SecurityPluginSetup } from '@kbn/security-plugin/server';
import { taggableTypes, tagSavedObjectTypeName } from '../../../common/constants';
import type { MergeGateResult } from '../../../common/merge';
import type { ITagsClient } from '../../../common/types';
import { getUpdatableSavedObjectTypes } from '../assignments/get_updatable_types';
import { MergeError } from './errors';
import { computeAffectedCount, findAffectedObjects } from './queries';

interface MergeServiceOptions {
  request: KibanaRequest;
  client: SavedObjectsClientContract;
  typeRegistry: ISavedObjectTypeRegistry;
  tagsClient: ITagsClient;
  authorization?: SecurityPluginSetup['authz'];
}

export type IMergeService = PublicMethodsOf<MergeService>;

/**
 * Server-side primitives shared by the merge-duplicate-tags preview/start routes and by
 * the `tag_merge` Task Manager runner, so the "affected objects" definition and the
 * authorization gates can't drift between preview and execution.
 */
export class MergeService {
  private readonly request: KibanaRequest;
  private readonly soClient: SavedObjectsClientContract;
  private readonly typeRegistry: ISavedObjectTypeRegistry;
  private readonly tagsClient: ITagsClient;
  private readonly authorization?: SecurityPluginSetup['authz'];

  constructor({ request, client, typeRegistry, tagsClient, authorization }: MergeServiceOptions) {
    this.request = request;
    this.soClient = client;
    this.typeRegistry = typeRegistry;
    this.tagsClient = tagsClient;
    this.authorization = authorization;
  }

  /** Dedupe `fromIds` and drop `toId` if present. */
  public normalizeFromIds(toId: string, fromIds: string[]): string[] {
    return uniq(fromIds.filter((id) => id !== toId));
  }

  /** Taggable types registered in this deployment that the current user can update. */
  public async getUpdatableTaggableTypes(): Promise<string[]> {
    return getUpdatableSavedObjectTypes({
      request: this.request,
      types: this.getKnownTaggableTypes(),
      authorization: this.authorization,
    });
  }

  /** All `taggableTypes` registered in this deployment, unfiltered by the caller's permissions. */
  public getKnownTaggableTypes(): string[] {
    return taggableTypes.filter((type) => this.typeRegistry.getType(type) !== undefined);
  }

  /** Throws a 400 {@link MergeError} if any of the given tag ids is a managed tag. */
  public async assertTagsNotManaged(tagIds: string[]): Promise<void> {
    const tags = await Promise.all(tagIds.map((id) => this.tagsClient.get(id)));
    const managedIds = tags.filter((tag) => tag.managed).map((tag) => tag.id);
    if (managedIds.length > 0) {
      throw new MergeError(`Managed tags cannot be merged: [${managedIds.join(', ')}]`, 400);
    }
  }

  /**
   * Count of objects, per updatable taggable type, that reference any of `fromIds` (OR).
   * Delegates to {@link computeAffectedCount}, the same primitive the `tag_merge` Task Manager
   * runner uses, so the "affected objects" definition can't drift between preview and execution.
   */
  public async computeAffectedCount(args: { fromIds: string[]; types: string[] }) {
    return computeAffectedCount(this.soClient, args);
  }

  /** Paginated listing of objects referencing any of `fromIds` (OR), across `types`. */
  public async findAffectedObjects(args: {
    fromIds: string[];
    types: string[];
    page: number;
    perPage: number;
  }) {
    return findAffectedObjects(this.soClient, this.typeRegistry, args);
  }

  /**
   * Baseline gate: can manage tag objects AND this specific merge would actually update at least
   * one saved object the user can access. Deliberately keyed on `affectedCount` (computed against
   * `updatableTypes`, i.e. already scoped to what *this* user can update) rather than "the user
   * can update *some* taggable type somewhere" — the latter is nearly always true for any active
   * editor and doesn't correlate with whether these specific `fromIds` are used by anything this
   * user could actually update. A merge with zero affected objects and no source deletion is a
   * pure no-op (nothing rewritten, tags stay separate); cleaning up a truly-unused duplicate tag
   * already has a simpler existing path (the plain "Delete" row action), so this gate doesn't need
   * a `deleteSources`-only carve-out for that case.
   */
  public async checkStartGate({
    affectedCount,
  }: {
    affectedCount: number;
  }): Promise<MergeGateResult> {
    const reasons: string[] = [];

    if (!(await this.canManageTagObjects())) {
      reasons.push('User cannot manage tag saved objects');
    }
    if (affectedCount === 0) {
      reasons.push('This merge would not update any saved objects you have permission to update');
    }

    return { allowed: reasons.length === 0, reasons };
  }

  /**
   * Gate 2a: source-tag deletion is only offered when the user can update every taggable type
   * that *actually* has a live reference to `fromIds` right now — not every taggable type
   * registered in the deployment. `affectedTypes` must come from an authoritative, unscoped scan
   * (an internal repository, not the per-user client): a per-user `find()` call silently narrows
   * to the types the caller can `find` rather than throwing on the rest, so computing
   * `affectedTypes` from a permission-scoped client would make this gate either trivially pass
   * (if scoped to the caller's own `updatableTypes`) or vacuous. See `preview.ts`/`start.ts` for
   * where that scan happens.
   */
  public async checkDeleteSourcesGate({
    updatableTypes,
    affectedTypes,
  }: {
    updatableTypes: string[];
    affectedTypes: string[];
  }): Promise<MergeGateResult> {
    const missingTypes = difference(affectedTypes, updatableTypes);

    return {
      allowed: missingTypes.length === 0,
      reasons:
        missingTypes.length === 0
          ? []
          : [`User cannot update all affected types: missing [${missingTypes.join(', ')}]`],
    };
  }

  private async canManageTagObjects(): Promise<boolean> {
    const [updatable, deletable] = await Promise.all([
      getUpdatableSavedObjectTypes({
        request: this.request,
        types: [tagSavedObjectTypeName],
        authorization: this.authorization,
        action: 'update',
      }),
      getUpdatableSavedObjectTypes({
        request: this.request,
        types: [tagSavedObjectTypeName],
        authorization: this.authorization,
        action: 'delete',
      }),
    ]);
    return updatable.includes(tagSavedObjectTypeName) && deletable.includes(tagSavedObjectTypeName);
  }
}
