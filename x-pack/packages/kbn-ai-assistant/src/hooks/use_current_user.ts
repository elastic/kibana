/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AuthenticatedUser } from '@kbn/security-plugin/common';
import { useEffect, useState } from 'react';

export function useCurrentUser() {
  const {
    services: { security },
  } = useKibana();

  const [user, setUser] = useState<AuthenticatedUser>();

  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const authenticatedUser = await security!.authc.getCurrentUser();
        setUser(authenticatedUser);
      } catch {
        setUser(undefined);
      }
    };
    getCurrentUser();
  }, [security]);

  return user;
}
