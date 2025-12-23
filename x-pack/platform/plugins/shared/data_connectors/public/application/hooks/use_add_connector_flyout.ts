/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { ActionConnector } from '@kbn/triggers-actions-ui-plugin/public';
import { useKibana } from './use_kibana';

export interface UseAddConnectorFlyoutOptions {
  onConnectorCreated?: (connector: ActionConnector) => void;
}

/**
 * Hook to manage the connector creation flyout.
 */
export const useAddConnectorFlyout = ({
  onConnectorCreated,
}: UseAddConnectorFlyoutOptions = {}) => {
  const {
    services: {
      plugins: { triggersActionsUi },
    },
  } = useKibana();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedConnectorType, setSelectedConnectorType] = useState<string | undefined>();

  const openFlyout = useCallback((actionTypeId?: string) => {
    setSelectedConnectorType(actionTypeId);
    setIsOpen(true);
  }, []);

  const closeFlyout = useCallback(() => {
    setIsOpen(false);
    setSelectedConnectorType(undefined);
  }, []);

  const handleConnectorCreated = useCallback(
    (connector: ActionConnector) => {
      onConnectorCreated?.(connector);
      closeFlyout();
    },
    [onConnectorCreated, closeFlyout]
  );

  const flyout = useMemo(() => {
    if (!isOpen) {
      return null;
    }

    return triggersActionsUi.getAddConnectorFlyout({
      onClose: closeFlyout,
      onConnectorCreated: handleConnectorCreated,
      ...(selectedConnectorType && {
        initialConnector: {
          actionTypeId: selectedConnectorType,
        },
      }),
    });
  }, [isOpen, selectedConnectorType, closeFlyout, handleConnectorCreated, triggersActionsUi]);

  return {
    openFlyout,
    closeFlyout,
    isOpen,
    flyout,
  };
};
