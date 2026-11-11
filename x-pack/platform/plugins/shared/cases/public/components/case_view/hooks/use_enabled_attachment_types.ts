/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { RegisteredUnifiedAttachmentType } from '../../../client/attachment_framework/types';
import { useKibana } from '../../../common/lib/kibana';
import { useCasesContext } from '../../cases_context/use_cases_context';

/** Registered attachment types the viewer can use, per each type's `isEnabled`. */
export const useEnabledAttachmentTypes = (): RegisteredUnifiedAttachmentType[] => {
  const { unifiedAttachmentTypeRegistry } = useCasesContext();
  const {
    services: {
      application: { capabilities },
    },
  } = useKibana();

  return useMemo(
    () =>
      unifiedAttachmentTypeRegistry
        .list()
        .filter((type) => type.isEnabled?.({ capabilities }) ?? true),
    [unifiedAttachmentTypeRegistry, capabilities]
  );
};
