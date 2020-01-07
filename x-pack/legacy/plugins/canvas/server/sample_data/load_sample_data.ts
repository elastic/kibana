/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CANVAS as label } from '../../i18n';
// @ts-ignore Untyped local
import { ecommerceSavedObjects, flightsSavedObjects, webLogsSavedObjects } from './index';
import { SampleDataRegistrySetup } from '../../../../../../src/plugins/home/server';

export function loadSampleData(
  addSavedObjectsToSampleDataset: SampleDataRegistrySetup['addSavedObjectsToSampleDataset'],
  addAppLinksToSampleDataset: SampleDataRegistrySetup['addAppLinksToSampleDataset']
) {
  const now = new Date();
  const nowTimestamp = now.toISOString();

  // @ts-ignore: Untyped local
  function updateCanvasWorkpadTimestamps(savedObjects) {
    // @ts-ignore: Untyped local
    return savedObjects.map(savedObject => {
      if (savedObject.type === 'canvas-workpad') {
        savedObject.attributes['@timestamp'] = nowTimestamp;
        savedObject.attributes['@created'] = nowTimestamp;
      }

      return savedObject;
    });
  }

  addSavedObjectsToSampleDataset('ecommerce', updateCanvasWorkpadTimestamps(ecommerceSavedObjects));
  addAppLinksToSampleDataset('ecommerce', [
    {
      path: '/app/canvas#/workpad/workpad-e08b9bdb-ec14-4339-94c4-063bddfd610e',
      icon: 'canvasApp',
      label,
    },
  ]);

  addSavedObjectsToSampleDataset('flights', updateCanvasWorkpadTimestamps(flightsSavedObjects));
  addAppLinksToSampleDataset('flights', [
    {
      path: '/app/canvas#/workpad/workpad-a474e74b-aedc-47c3-894a-db77e62c41e0',
      icon: 'canvasApp',
      label,
    },
  ]);

  addSavedObjectsToSampleDataset('logs', updateCanvasWorkpadTimestamps(webLogsSavedObjects));
  addAppLinksToSampleDataset('logs', [
    {
      path: '/app/canvas#/workpad/workpad-ad72a4e9-b422-480c-be6d-a64a0b79541d',
      icon: 'canvasApp',
      label,
    },
  ]);
}
