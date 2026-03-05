/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

export const useLinkedSavedDashboardExists = ({
  linkedSavedObjectId,
  doesSavedDashboardExist,
}: {
  linkedSavedObjectId?: string;
  doesSavedDashboardExist: (dashboardId: string) => Promise<boolean>;
}): boolean => {
  const [linkedSavedDashboardExists, setLinkedSavedDashboardExists] = useState(false);

  useEffect(() => {
    let canceled = false;

    if (!linkedSavedObjectId) {
      setLinkedSavedDashboardExists(false);
      return;
    }

    setLinkedSavedDashboardExists(false);
    doesSavedDashboardExist(linkedSavedObjectId)
      .then((exists) => {
        if (!canceled) {
          setLinkedSavedDashboardExists(exists);
        }
      })
      .catch(() => {
        if (!canceled) {
          setLinkedSavedDashboardExists(false);
        }
      });

    return () => {
      canceled = true;
    };
  }, [linkedSavedObjectId, doesSavedDashboardExist]);

  return linkedSavedDashboardExists;
};
