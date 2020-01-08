/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useState, useCallback } from 'react';

import { npStart } from 'ui/new_platform';
import {
  SavedObjectAttributes,
  SavedObjectsCreateOptions,
  SimpleSavedObject,
} from 'src/core/public';

export const useCreateSavedObject = (type: string) => {
  const [data, setData] = useState<SimpleSavedObject<SavedObjectAttributes> | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const create = useCallback(
    (attributes: SavedObjectAttributes, options?: SavedObjectsCreateOptions) => {
      setLoading(true);
      const save = async () => {
        try {
          const d = await npStart.core.savedObjects.client.create(type, attributes, options);
          setCreatedId(d.id);
          setError(null);
          setData(d);
          setLoading(false);
        } catch (e) {
          setLoading(false);
          setError(e);
        }
      };
      save();
    },
    [type]
  );

  return {
    data,
    loading,
    error,
    create,
    createdId,
  };
};
