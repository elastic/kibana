/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

import { useMlKibana } from '../../../../contexts/kibana';

export const useCanCreateDataView = () => {
  const {
    services: {
      application: { capabilities },
    },
  } = useMlKibana();

  return useMemo(
    () =>
      capabilities.savedObjectsManagement.edit === true || capabilities.indexPatterns.save === true,
    [capabilities]
  );
};
