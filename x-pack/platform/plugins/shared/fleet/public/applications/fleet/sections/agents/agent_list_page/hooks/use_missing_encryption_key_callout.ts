/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useCallback, useState, useEffect } from 'react';

import { useFleetStatus, useStartServices } from '../../../../hooks';

const LOCAL_STORAGE_KEY = 'fleet.missingEncryptionKeyCalloutHasBeenDismissed';

export const useMissingEncryptionKeyCallout = (): [boolean, () => void] => {
  const { missingOptionalFeatures } = useFleetStatus();
  const { storage } = useStartServices();

  const [isCalloutDismissed, setIsCalloutDismissed] = useState(false);

  useEffect(() => {
    const storageValue = storage.get(LOCAL_STORAGE_KEY);
    if (storageValue) {
      setIsCalloutDismissed(Boolean(storageValue));
    }
  }, [storage]);
  const canShowMissingEncryptionKeyCallout = useMemo(() => {
    if (isCalloutDismissed || !missingOptionalFeatures) {
      return false;
    }

    return missingOptionalFeatures.includes('encrypted_saved_object_encryption_key_required');
  }, [missingOptionalFeatures, isCalloutDismissed]);

  const dismissEncryptionKeyCallout = useCallback(() => {
    storage.set(LOCAL_STORAGE_KEY, 'true');
    setIsCalloutDismissed(true);
  }, [storage]);

  return [canShowMissingEncryptionKeyCallout, dismissEncryptionKeyCallout];
};
