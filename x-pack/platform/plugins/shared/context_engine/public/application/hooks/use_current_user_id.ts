/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { useKibana } from './use_kibana';

/** The logged-in Kibana user's username, or `undefined` while it resolves or when unavailable. */
export const useCurrentUserId = (): string | undefined => {
  const {
    services: { security },
  } = useKibana();
  const [userId, setUserId] = useState<string>();

  useEffect(() => {
    let cancelled = false;
    security.authc
      .getCurrentUser()
      .then((user) => {
        if (!cancelled) {
          setUserId(user.username);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUserId(undefined);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [security]);

  return userId;
};
