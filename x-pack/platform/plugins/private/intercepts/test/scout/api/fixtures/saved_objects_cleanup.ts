/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

interface SavedObjectIdentifier {
  readonly type: string;
  readonly id: string;
}

/** Tracks and validates cleanup of saved objects owned by the current test. */
export class SavedObjectsCleanup {
  private readonly ownedObjects = new Map<string, SavedObjectIdentifier>();

  public track(object: SavedObjectIdentifier): void {
    this.ownedObjects.set(`${object.type}:${object.id}`, object);
  }

  public async cleanup(kbnClient: KbnClient): Promise<void> {
    const objects = [...this.ownedObjects.values()];

    try {
      const { deleted, missing } = await kbnClient.savedObjects.bulkDelete({ objects });
      expect(deleted + missing).toBe(objects.length);
    } finally {
      this.ownedObjects.clear();
    }
  }
}
