/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'fs';
import type { KbnClient } from '@kbn/test';
import type { ApiServicesFixture } from '@kbn/scout';

interface Artifact {
  type: string;
  title?: string;
}

/**
 * Tracks saved objects created during tests and bulk-deletes them on cleanup.
 * Safe for serial Playwright execution within a single file.
 */
export class SavedObjectsTracker {
  private readonly artifacts: Artifact[] = [];

  track(artifact: Artifact) {
    this.artifacts.push(artifact);
  }

  async cleanup(kbnClient: KbnClient) {
    if (this.artifacts.length === 0) return;

    const uniqueTypes = [...new Set(this.artifacts.map((a) => a.type))];
    for (const type of uniqueTypes) {
      const response = await kbnClient.savedObjects.find<{ title: string }>({ type });
      const artifactsOfType = this.artifacts.filter((a) => a.type === type);
      const cleanAll = artifactsOfType.some((a) => !a.title);

      const objectsToDelete = cleanAll
        ? response.saved_objects
        : response.saved_objects.filter((so) =>
            artifactsOfType.some((a) => a.title === so.attributes.title)
          );

      if (objectsToDelete.length > 0) {
        await kbnClient.savedObjects.bulkDelete({
          objects: objectsToDelete.map((so) => ({ type: so.type, id: so.id })),
        });
      }
    }
    this.artifacts.length = 0;
  }
}

/**
 * Deletes a downloaded file if it exists. Returns null so callers can reset their reference.
 */
export function cleanupDownloadedFile(filePath: string | null): null {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  return null;
}

/**
 * Installs logs sample data and applies default UI settings.
 */
export async function installLogsSampleData({
  apiServices,
  kbnClient,
  settings,
}: {
  apiServices: ApiServicesFixture;
  kbnClient: KbnClient;
  settings: Record<string, string>;
}) {
  await apiServices.sampleData.install('logs');
  await kbnClient.uiSettings.update(settings);
}

/**
 * Removes logs sample data and cleans up all standard saved objects.
 */
export async function removeLogsSampleData({
  apiServices,
  kbnClient,
}: {
  apiServices: ApiServicesFixture;
  kbnClient: KbnClient;
}) {
  await apiServices.sampleData.remove('logs');
  await kbnClient.savedObjects.cleanStandardList();
}
