/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useChangeHistoryModal } from '@kbn/change-history-ui';

/**
 * Opens the change-history modal once after the provider mounts. Remount (via
 * `key`) to open again for another rule.
 */
export const AutoOpenChangeHistoryModal = (): null => {
  const { openModal } = useChangeHistoryModal();

  useEffect(() => {
    openModal();
  }, [openModal]);

  return null;
};
