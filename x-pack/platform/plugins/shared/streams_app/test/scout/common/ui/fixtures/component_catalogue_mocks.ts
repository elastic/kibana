/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout';
import type { ComponentCatalogue, ComponentValidationResult } from '@kbn/streams-schema';
import snapshot from '../../../../../public/services/component_catalogue/catalogue_snapshot/components_v1.json';

const VALID: ComponentValidationResult = { valid: true, diagnostics: [] };

export const CATALOGUE_SNAPSHOT = snapshot as ComponentCatalogue;

/**
 * The catalogue routes call the config distributor, which the test stack does not run, so the
 * catalogue is served from the captured snapshot and every component validates as `validation`.
 */
export const mockComponentCatalogue = async (
  page: ScoutPage,
  {
    catalogue = CATALOGUE_SNAPSHOT,
    validation = VALID,
  }: { catalogue?: ComponentCatalogue; validation?: ComponentValidationResult } = {}
) => {
  await page.route('**/internal/streams/components', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(catalogue),
    })
  );
  await page.route('**/internal/streams/components/_validate', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(validation),
    })
  );
};
