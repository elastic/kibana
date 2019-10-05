/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObject, SavedObjectsClientContract } from 'src/core/server';
import { SAVED_OBJ_REPO_REF } from '../../common/constants';

export interface RepositoryReferenceHelper {
  /**
   * Creates a reference from the current namespace to the given repository.
   *
   * @param uri The uri of the repository.
   * @returns true if there is no other references for the repository, false otherwise.
   */
  createReference(uri: string): Promise<boolean>;

  /**
   * Checks whether there is a reference from the current namespace to the given repository.
   *
   * @param uri The uri of the repository.
   * @returns true if there is a reference from the current namespace to the given repository, false otherwise.
   */
  hasReference(uri: string): Promise<boolean>;

  /**
   * Throws an error if there is no reference from the current namespace to the given repository.
   * there is none.
   *
   * @param uri The uri of the repository.
   */
  ensureReference(uri: string): Promise<void>;

  /**
   * Deletes the reference from the current namespace to the given repository.
   *
   * @param uri The uri of the repository.
   * @returns True if there is no more references to the repository after the deletion.
   */
  deleteReference(uri: string): Promise<boolean>;

  /**
   * Finds all repository uris of which the current namespace has references.
   *
   * @returns uris the current namespace references to.
   */
  findReferences(): Promise<string[]>;
}

/**
 * A factory function helps to create a appropriate helper instance.
 *
 * @param client A saved objects client instance.
 * @returns An helper instance.
 */
export function getReferenceHelper(client: SavedObjectsClientContract): RepositoryReferenceHelper {
  return new SharedObjectReferenceHelper(client);
}

class SharedObjectReferenceHelper implements RepositoryReferenceHelper {
  constructor(private readonly client: SavedObjectsClientContract) {}

  /**
   * TODO better way to access the current space
   */
  private namespace(): string {
    // @ts-ignore
    return this.client.spaceId;
  }

  async createReference(uri: string): Promise<boolean> {
    let obj: SavedObject<any> | undefined;
    try {
      obj = await this.client.get(SAVED_OBJ_REPO_REF, uri);
    } catch (e) {
      obj = undefined;
    }
    if (obj === undefined) {
      await this.client.create(
        SAVED_OBJ_REPO_REF,
        {
          uri,
          namespaces: [this.namespace()],
        },
        {
          id: uri,
        }
      );
      return true;
    } else {
      const namespaces = new Set((obj.attributes as RepositoryReferences).namespaces);
      if (namespaces.has(this.namespace())) {
        throw new Error(`Reference to [${uri}] from [${this.namespace()}] already exists`);
      }
      namespaces.add(this.namespace());
      await this.client.update(
        SAVED_OBJ_REPO_REF,
        uri,
        {
          uri,
          namespaces: Array.from(namespaces),
        },
        {
          version: obj.version,
        }
      );
      return false;
    }
  }

  async deleteReference(uri: string): Promise<boolean> {
    const obj = await this.client.get(SAVED_OBJ_REPO_REF, uri);
    const refs = obj.attributes as RepositoryReferences;
    const namespaces = new Set(refs.namespaces);
    namespaces.delete(this.namespace());
    if (namespaces.size === 0) {
      // TODO delete should also support versioning
      await this.client.delete(SAVED_OBJ_REPO_REF, uri);
      return true;
    } else {
      await this.client.update(
        SAVED_OBJ_REPO_REF,
        uri,
        {
          uri,
          namespaces: Array.from(namespaces),
        },
        {
          version: obj.version,
        }
      );
      return false;
    }
  }

  async ensureReference(uri: string): Promise<void> {
    if (!(await this.hasReference(uri))) {
      throw new Error(`Space [${this.namespace()}] has no reference of [${uri}]`);
    }
  }

  async hasReference(uri: string): Promise<boolean> {
    try {
      const obj = await this.client.get(SAVED_OBJ_REPO_REF, uri);
      const refs = obj.attributes as RepositoryReferences;
      return refs.namespaces.indexOf(this.namespace()) >= 0;
    } catch (e) {
      // if (SavedObjectsErrorHelpers.isNotFoundError(e)) {
      //   return false;
      // }
      return false;
    }
  }

  async findReferences(): Promise<string[]> {
    const resp = await this.client.find({
      type: SAVED_OBJ_REPO_REF,
      fields: ['uri'],
      searchFields: ['namespaces'],
      search: this.namespace(),
      defaultSearchOperator: 'AND',
    });
    return resp.saved_objects.map(obj => obj.attributes.uri as string);
  }
}

interface RepositoryReferences {
  uri: string;
  namespaces: string[];
}
