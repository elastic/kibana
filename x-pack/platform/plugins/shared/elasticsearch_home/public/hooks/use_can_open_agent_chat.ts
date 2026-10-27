/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useHomeServices } from '../context';

/** Whether the user holds the Agent Builder privilege and the license it needs to open a chat. */
export const useCanOpenAgentChat = (): boolean => {
  const { agentBuilder, application } = useHomeServices();
  const canShowAgentBuilder = application.capabilities.agentBuilder?.show === true;

  const [hasRequiredLicense, setHasRequiredLicense] = useState(false);
  useEffect(() => {
    if (!canShowAgentBuilder) {
      return;
    }

    let cancelled = false;

    const resolveAccess = async () => {
      try {
        const access = await agentBuilder.getAgentBuilderAccess();
        if (!cancelled) {
          setHasRequiredLicense(access.hasRequiredLicense);
        }
      } catch {
        if (!cancelled) {
          setHasRequiredLicense(false);
        }
      }
    };

    resolveAccess();

    return () => {
      cancelled = true;
    };
  }, [agentBuilder, canShowAgentBuilder]);

  return canShowAgentBuilder && hasRequiredLicense;
};
