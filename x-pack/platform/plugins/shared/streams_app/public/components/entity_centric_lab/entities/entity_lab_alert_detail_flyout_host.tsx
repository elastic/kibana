/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertRow, EntityFlyoutServices } from '@kbn/entity-centric-lab-flyout';

export interface EntityLabAlertDetailFlyoutRequest {
  readonly alertRow: AlertRow;
  readonly entityName: string;
}

interface EntityLabAlertDetailFlyoutHostProps {
  readonly request: EntityLabAlertDetailFlyoutRequest | null;
  readonly onClose: () => void;
  readonly renderAlertDetailFlyout: NonNullable<EntityFlyoutServices['renderAlertDetailFlyout']>;
}

export const EntityLabAlertDetailFlyoutHost = ({
  request,
  onClose,
  renderAlertDetailFlyout,
}: EntityLabAlertDetailFlyoutHostProps) => {
  if (!request) {
    return null;
  }
  return renderAlertDetailFlyout({
    alertRow: request.alertRow,
    entityName: request.entityName,
    onClose,
  });
};
