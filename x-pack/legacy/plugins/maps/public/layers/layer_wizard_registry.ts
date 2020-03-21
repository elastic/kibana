/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* eslint-disable @typescript-eslint/consistent-type-definitions */

type LayerWizard = {
  description: string;
  icon: string;
  id: string;
  isIndexingSource?: boolean;
  order: number; // number to control display order in UI. Lower numbers display first
  renderWizard({
    onPreviewSource,
    inspectorAdapters,
  }: {
    onPreviewSource: () => void;
    inspectorAdapters: unknown;
  }): unknown;
  title: string;
  sourceType: string;
};

const registry: LayerWizard[] = [];

export function registerLayerWizard(layerWizard: LayerWizard) {
  registry.push(layerWizard);
}

export function getLayerWizards(): LayerWizard[] {
  return registry.sort(function(a: LayerWizard, b: LayerWizard) {
    return a.order - b.order;
  });
}

export function getLayerWizard(id: string): LayerWizard | undefined {
  return registry.find((layerWizard: LayerWizard) => layerWizard.id === id);
}
