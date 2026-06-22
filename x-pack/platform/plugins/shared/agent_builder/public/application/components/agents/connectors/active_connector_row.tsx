/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { ConnectorItem } from '../../../../../common/http_api/tools';
import { ActiveItemRow } from '../common/active_item_row';

interface ActiveConnectorRowProps {
  connector: ConnectorItem;
  isSelected: boolean;
  onSelect: (connector: ConnectorItem) => void;
  onRemove: (connector: ConnectorItem) => void;
  canEditAgent: boolean;
}

export const ActiveConnectorRow: React.FC<ActiveConnectorRowProps> = ({
  connector,
  isSelected,
  onSelect,
  onRemove,
  canEditAgent,
}) => {
  return (
    <ActiveItemRow
      id={connector.id}
      name={connector.name}
      isSelected={isSelected}
      onSelect={() => onSelect(connector)}
      onRemove={() => onRemove(connector)}
      removeAriaLabel={i18n.translate('xpack.agentBuilder.agentConnectors.removeAriaLabel', {
        defaultMessage: 'Remove {name}',
        values: { name: connector.name },
      })}
      canEditAgent={canEditAgent}
    />
  );
};
