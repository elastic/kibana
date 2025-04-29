/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import { SpacesData } from '@kbn/spaces-plugin/public';
import { useKibana } from './kibana_react';

export const useSpacesData = () => {
  const { spaces } = useKibana().services;
  const [spacesData, setSpacesData] = useState<SpacesData | undefined>(undefined);
  const spacesService = spaces?.ui.useSpaces();

  useEffect(() => {
    (async () => {
      const result = await spacesService?.spacesDataPromise;
      setSpacesData(result);
    })();
  }, [spaces, spacesService, setSpacesData]);
  return spacesData;
};
