/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSetSelection } from '../../hooks/use_set_selection';

export const useGeoTabState = (availableGeos: string[]) => {
  const geoSelection = useSetSelection(availableGeos);
  return { geoSelection };
};
