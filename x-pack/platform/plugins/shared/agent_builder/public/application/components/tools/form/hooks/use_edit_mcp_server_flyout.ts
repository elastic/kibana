/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { ConnectorItem } from '../../../../../../common/http_api/tools';
import { isMcpConnectorItem } from '../../../../../../common/http_api/tools';
import { useKibana } from '../../../../hooks/use_kibana';
import { useFlyoutState } from '../../../../hooks/use_flyout_state';

export interface UseEditMcpServerFlyoutProps {
  connector: ConnectorItem | undefined;
}

export const useEditMcpServerFlyout = ({ connector }: UseEditMcpServerFlyoutProps) => {
  const {
    services: {
      plugins: { triggersActionsUi },
    },
  } = useKibana();

  const { openFlyout, closeFlyout, isOpen } = useFlyoutState();

  const flyout = useMemo(
    () =>
      connector && isMcpConnectorItem(connector)
        ? triggersActionsUi.getEditConnectorFlyout({
            onClose: closeFlyout,
            connector: {
              ...connector,
              secrets: {},
              config: connector.config ?? {},
            },
          })
        : null,
    [closeFlyout, connector, triggersActionsUi]
  );

  return {
    openFlyout,
    closeFlyout,
    isOpen,
    flyout,
  };
};
