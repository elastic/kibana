/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { useOnechatServices } from '../../hooks/use_onechat_service';

export const AccessBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  const {
    access: { hasRequiredLicense, hasLlmConnector },
  } = useOnechatServices();

  if (!hasRequiredLicense) {
    // TODO: Render "upgrade your license" prompt
    return null;
  }

  if (!hasLlmConnector) {
    // TODO: Render "connect to an LLM" prompt
    return null;
  }

  return children;
};
