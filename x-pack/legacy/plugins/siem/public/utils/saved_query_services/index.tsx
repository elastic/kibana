/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useEffect } from 'react';
import {
  SavedQueryService,
  createSavedQueryService,
} from '../../../../../../../src/plugins/data/public';

import { useKibanaCore } from '../../lib/compose/kibana_core';

export const useSavedQueryServices = () => {
  const core = useKibanaCore();
  const [savedQueryService, setSavedQueryService] = useState<SavedQueryService>(
    createSavedQueryService(core.savedObjects.client)
  );

  useEffect(() => {
    setSavedQueryService(createSavedQueryService(core.savedObjects.client));
  }, [core.savedObjects.client]);
  return savedQueryService;
};
