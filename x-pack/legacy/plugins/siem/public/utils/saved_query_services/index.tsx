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

import { useKibana } from '../../lib/kibana';

export const useSavedQueryServices = () => {
  const kibana = useKibana();
  const client = kibana.services.savedObjects!.client;

  const [savedQueryService, setSavedQueryService] = useState<SavedQueryService>(
    createSavedQueryService(client)
  );

  useEffect(() => {
    setSavedQueryService(createSavedQueryService(client));
  }, [client]);
  return savedQueryService;
};
