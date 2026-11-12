/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getOpenLayerWizardFromUrlParam } from './get_open_layer_wizard_url_param';

describe('getOpenLayerWizardFromUrlParam', () => {
  const navigateTo = (url: string) => window.history.pushState({}, '', url);

  test('should read the param from the hash, as registered by the integration cards', () => {
    navigateTo('/app/maps/map#?openLayerWizard=uploadGeoFile');
    expect(getOpenLayerWizardFromUrlParam()).toBe('uploadGeoFile');
  });

  test('should read the param from the query string', () => {
    navigateTo('/app/maps/map?openLayerWizard=uploadGeoFile');
    expect(getOpenLayerWizardFromUrlParam()).toBe('uploadGeoFile');
  });

  test('should return an empty string when the param is absent', () => {
    navigateTo('/app/maps/map?_g=()');
    expect(getOpenLayerWizardFromUrlParam()).toBe('');
  });

  test('should return an empty string when there is no query string or hash', () => {
    navigateTo('/app/maps/map');
    expect(getOpenLayerWizardFromUrlParam()).toBe('');
  });
});
