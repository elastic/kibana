/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AlertRow } from '@kbn/entity-centric-lab-flyout';

interface EntityLabAlertDetailMockFlyoutProps {
  readonly alertRow: AlertRow;
  readonly entityName: string;
  readonly onClose: () => void;
}

/** Fallback child flyout when Observability start is unavailable in dev. */
export const EntityLabAlertDetailMockFlyout = ({
  alertRow,
  entityName,
  onClose,
}: EntityLabAlertDetailMockFlyoutProps) => (
  <EuiFlyoutResizable
    onClose={onClose}
    size="s"
    session="inherit"
    ownFocus={false}
    data-test-subj="entityLabAlertDetailMockFlyout"
    aria-label={alertRow.ruleName}
  >
    <EuiFlyoutHeader hasBorder css={css`padding-bottom: 0;`}>
      <EuiTitle size="s">
        <h2>{alertRow.ruleName}</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        {i18n.translate('xpack.streams.entityCentricLab.alertMockFlyout.subtitle', {
          defaultMessage: 'Alert on {entityName}',
          values: { entityName },
        })}
      </EuiText>
    </EuiFlyoutHeader>
    <EuiFlyoutBody>
      <EuiText size="s">
        <p>
          <strong>
            {i18n.translate('xpack.streams.entityCentricLab.alertMockFlyout.reasonLabel', {
              defaultMessage: 'Reason',
            })}
          </strong>
        </p>
        <p>{alertRow.reason}</p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiText size="xs" color="subdued">
        {i18n.translate('xpack.streams.entityCentricLab.alertMockFlyout.devNote', {
          defaultMessage:
            'Observability alert flyout is loading in this environment. Rule links are wired; restart Kibana on Node 24.14.1 after pulling latest changes for the production Alerts flyout.',
        })}
      </EuiText>
    </EuiFlyoutBody>
  </EuiFlyoutResizable>
);
