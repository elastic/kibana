/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OPEN_LAYER_WIZARD } from '../../../../common/constants';

export function getOpenLayerWizardFromUrlParam() {
  const locationSplit = window.location.href.split(/[?#]+/);

  if (locationSplit.length <= 1) {
    return '';
  }

  const mapAppParams = new URLSearchParams(locationSplit[1]);
  if (!mapAppParams.has(OPEN_LAYER_WIZARD)) {
    return '';
  }

  return mapAppParams.has(OPEN_LAYER_WIZARD) ? mapAppParams.get(OPEN_LAYER_WIZARD) : '';
}
