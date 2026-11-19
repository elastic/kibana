/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useServiceAccountDirectory } from '../../../../entities/service_accounts';
import { createServiceAccountEditor } from '../../lib/service_accounts/service_account_editor';

export const useServiceAccountEditor = () => {
  const directory = useServiceAccountDirectory();
  return useMemo(() => createServiceAccountEditor(directory), [directory]);
};
