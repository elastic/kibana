/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import Boom from 'boom';
import { SAVED_OBJ_REPO } from '../../common/constants';

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
  return new DefaultReferenceHelper(client);
}

class DefaultReferenceHelper implements RepositoryReferenceHelper {
  constructor(private readonly client: SavedObjectsClientContract) {}

  async createReference(uri: string): Promise<boolean> {
    try {
      await this.client.create(
        SAVED_OBJ_REPO,
        {
          uri,
        },
        {
          id: uri,
        }
      );
      return true;
    } catch (e) {
      if (Boom.isBoom(e) && e.output.statusCode === 409) {
        return false;
      }
      throw e;
    }
  }

  async deleteReference(uri: string): Promise<boolean> {
    await this.client.delete(SAVED_OBJ_REPO, uri);
    return true;
  }

  async ensureReference(uri: string): Promise<void> {
    await this.client.get(SAVED_OBJ_REPO, uri);
  }

  async hasReference(uri: string): Promise<boolean> {
    try {
      await this.ensureReference(uri);
      return true;
    } catch (e) {
      if (Boom.isBoom(e) && e.output.statusCode === 404) {
        return false;
      }
      throw e;
    }
  }

  async findReferences(): Promise<string[]> {
    const resp = await this.client.find({
      type: SAVED_OBJ_REPO,
    });
    return resp.saved_objects.map(obj => obj.attributes.uri as string);
  }
}
