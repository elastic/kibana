/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectReference } from '@kbn/core/server';
import { NONE_CONNECTOR_ID } from '../../common/constants';

interface Reference {
  soReference?: SavedObjectReference;
  name: string;
}

/**
 * A reference name that holds a list of references, such as the destinations of a merged case.
 * `ids` undefined means the update doesn't touch the list; an empty array removes every reference
 * with that name.
 */
interface MultiReference {
  name: string;
  type: string;
  ids?: string[];
}

export class ConnectorReferenceHandler {
  private newReferences: Reference[] = [];
  private multiReferences: Array<Required<MultiReference>> = [];

  constructor(
    references: Array<{ id?: string | null; name: string; type: string }>,
    multiReferences: MultiReference[] = []
  ) {
    for (const { id, name, type } of references) {
      // When id is null, or the none connector we'll try to remove the reference if it exists
      // When id is undefined it means that we're doing a patch request and this particular field shouldn't be updated
      // so we'll ignore it. If it was already in the reference array then it'll stay there when we merge them together below
      if (id === null || id === NONE_CONNECTOR_ID) {
        this.newReferences.push({ name });
      } else if (id) {
        this.newReferences.push({ soReference: { id, name, type }, name });
      }
    }

    for (const { name, type, ids } of multiReferences) {
      if (ids !== undefined) {
        this.multiReferences.push({ name, type, ids });
      }
    }
  }

  /**
   * Whether the update changes any reference this handler manages. When it doesn't, the update can
   * leave the stored references alone instead of rewriting them from a possibly stale read.
   */
  public hasChanges(): boolean {
    return this.newReferences.length > 0 || this.multiReferences.length > 0;
  }

  /**
   * Merges the references passed to the constructor into the original references passed into this function.
   * References with a name this handler doesn't manage are kept as they are.
   *
   * @param originalReferences existing saved object references
   * @returns a merged reference list or undefined when there are no new or existing references
   */
  public build(originalReferences?: SavedObjectReference[]): SavedObjectReference[] | undefined {
    if (!this.hasChanges()) {
      return originalReferences;
    }

    const singleByName = new Map(
      this.newReferences.map((reference) => [reference.name, reference])
    );
    const multiNames = new Set(this.multiReferences.map(({ name }) => name));
    const placedNames = new Set<string>();
    const references: SavedObjectReference[] = [];

    for (const reference of (originalReferences ?? []).filter(
      ({ name }) => !multiNames.has(name)
    )) {
      const newReference = singleByName.get(reference.name);
      if (newReference == null) {
        references.push(reference);
      } else if (!placedNames.has(reference.name)) {
        placedNames.add(reference.name);
        if (newReference.soReference) {
          references.push(newReference.soReference);
        }
      }
    }

    for (const [name, { soReference }] of singleByName) {
      if (!placedNames.has(name) && soReference) {
        references.push(soReference);
      }
    }

    for (const { name, type, ids } of this.multiReferences) {
      references.push(...ids.map((id) => ({ id, name, type })));
    }

    return references;
  }
}
