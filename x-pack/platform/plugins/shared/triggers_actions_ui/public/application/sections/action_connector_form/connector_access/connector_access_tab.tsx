/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ObjectAccessPanel } from '@kbn/access-control-ui';
import { useKibana } from '../../../../common/lib/kibana';
import { CONNECTOR_ACCESS_COPY } from './connector_access_copy';

export interface ConnectorAccessTabProps {
  connectorId: string;
  onAccessChange?: () => void;
}

/**
 * The Access tab of the edit flyout: who can view, run, and edit a stored connector.
 */
export const ConnectorAccessTab = ({ connectorId, onAccessChange }: ConnectorAccessTabProps) => {
  const { http, notifications } = useKibana().services;
  return (
    <ObjectAccessPanel
      http={http}
      toasts={notifications.toasts}
      type="action"
      id={connectorId}
      copy={CONNECTOR_ACCESS_COPY}
      onAccessChange={onAccessChange}
    />
  );
};
