/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

type LayerWizard = {
  description: string;
  icon: string;
  isIndexingSource?: boolean;
  renderWizard({
    onPreviewSource,
    inspectorAdapters,
  }: {
    onPreviewSource: () => void;
    inspectorAdapters: unknown;
  }): unknown;
  title: string;
};

const registry: LayerWizard[] = [];

export function registerLayerWizard(layerWizard: LayerWizard) {
  registry.push(layerWizard);
}

export function getLayerWizards(): LayerWizard[] {
  return [...registry];
}
