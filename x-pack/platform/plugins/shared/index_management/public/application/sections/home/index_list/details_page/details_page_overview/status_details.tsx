/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiTextColor,
  EuiBadgeProps,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';

import { useAppContext } from '../../../../../app_context';
import { Index } from '../../../../../../../common';
import { OverviewCard } from './overview_card';

type NormalizedHealth = 'green' | 'red' | 'yellow';
const healthToBadgeMapping: Record<
  NormalizedHealth,
  { color: EuiBadgeProps['color']; label: string }
> = {
  green: {
    color: 'success',
    label: i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.health.greenLabel', {
      defaultMessage: 'Healthy',
    }),
  },
  yellow: {
    color: 'warning',
    label: i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.health.yellowLabel', {
      defaultMessage: 'Warning',
    }),
  },
  red: {
    color: 'danger',
    label: i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.health.redLabel', {
      defaultMessage: 'Critical',
    }),
  },
};

export const StatusDetails: FunctionComponent<{
  documents: Index['documents'];
  documentsDeleted: Index['documents_deleted'];
  status: Index['status'];
  health: Index['health'];
}> = ({ documents, documentsDeleted, status, health }) => {
  const { config } = useAppContext();
  if (!config.enableIndexStats || !health) {
    return null;
  }
  const badgeConfig = healthToBadgeMapping[health.toLowerCase() as NormalizedHealth];
  const healthBadge = <EuiBadge color={badgeConfig.color}>{badgeConfig.label}</EuiBadge>;

  return (
    <OverviewCard
      data-test-subj="indexDetailsStatus"
      title={i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.status.cardTitle', {
        defaultMessage: 'Status',
      })}
      content={{
        left: (
          <EuiText
            color={status === 'close' ? 'danger' : 'success'}
            css={css`
              font-size: ${euiThemeVars.euiFontSizeL};
            `}
          >
            {status === 'close'
              ? i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.status.closedLabel', {
                  defaultMessage: 'Closed',
                })
              : i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.status.openLabel', {
                  defaultMessage: 'Open',
                })}
          </EuiText>
        ),
        right: (
          <div
            css={css`
              max-width: 100px;
            `}
          >
            {healthBadge}
          </div>
        ),
      }}
      footer={{
        left: (
          <EuiFlexGroup gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiIcon type="documents" color="subdued" />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTextColor color="subdued">
                {i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.status.documentsLabel', {
                  defaultMessage:
                    '{documents, plural, one {# Document} other {# Documents}} / {documentsDeleted} Deleted',
                  values: {
                    documents,
                    documentsDeleted,
                  },
                })}
              </EuiTextColor>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      }}
    />
  );
};
