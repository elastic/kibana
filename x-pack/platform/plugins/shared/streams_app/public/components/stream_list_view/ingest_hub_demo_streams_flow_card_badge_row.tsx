/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiBadge, EuiToolTip, euiFontSize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

export type FlowCanvasDataProduct = 'metrics' | 'logs';

export function inferFlowCanvasDataProduct(streamName: string): FlowCanvasDataProduct {
  const n = streamName.toLowerCase();
  if (n.includes('metric') || n.startsWith('metrics-')) {
    return 'metrics';
  }
  return 'logs';
}

export interface FlowCanvasQualityStatusBadgeProps {
  readonly status: 'good' | 'degraded' | 'poor';
}

/** Icon-only quality badge (good / degraded / poor) for flow canvas cards. */
export function FlowCanvasQualityStatusBadge({ status }: FlowCanvasQualityStatusBadgeProps) {
  const { euiTheme } = useEuiTheme();

  const overlapWhiteRingCss = useMemo(
    () => css`
      box-shadow: 0 0 0 ${euiTheme.border.width.thick} #ffffff;
    `,
    [euiTheme.border.width.thick]
  );

  const statusGoodTip = i18n.translate('xpack.streams.ingestHubFlowCanvas.badgeStatusGoodTooltip', {
    defaultMessage: 'Good data quality',
  });
  const statusDegradedTip = i18n.translate(
    'xpack.streams.ingestHubFlowCanvas.badgeStatusDegradedTooltip',
    {
      defaultMessage: 'Degraded data quality',
    }
  );
  const statusPoorTip = i18n.translate('xpack.streams.ingestHubFlowCanvas.badgeStatusPoorTooltip', {
    defaultMessage: 'Poor data quality',
  });

  const statusGoodAria = i18n.translate('xpack.streams.ingestHubFlowCanvas.badgeStatusGoodAria', {
    defaultMessage: 'Good quality',
  });
  const statusDegradedAria = i18n.translate(
    'xpack.streams.ingestHubFlowCanvas.badgeStatusDegradedAria',
    {
      defaultMessage: 'Degraded quality',
    }
  );
  const statusPoorAria = i18n.translate('xpack.streams.ingestHubFlowCanvas.badgeStatusPoorAria', {
    defaultMessage: 'Poor quality',
  });

  if (status === 'good') {
    return (
      <EuiToolTip content={statusGoodTip} position="top" delay="regular">
        <EuiBadge
          color="success"
          iconType="checkCircle"
          iconSide="left"
          aria-label={statusGoodAria}
          css={overlapWhiteRingCss}
        />
      </EuiToolTip>
    );
  }

  if (status === 'degraded') {
    return (
      <EuiToolTip content={statusDegradedTip} position="top" delay="regular">
        <EuiBadge
          color="warning"
          iconType="warning"
          iconSide="left"
          aria-label={statusDegradedAria}
          css={overlapWhiteRingCss}
        />
      </EuiToolTip>
    );
  }

  return (
    <EuiToolTip content={statusPoorTip} position="top" delay="regular">
      <EuiBadge
        color="danger"
        iconType="error"
        iconSide="left"
        aria-label={statusPoorAria}
        css={overlapWhiteRingCss}
      />
    </EuiToolTip>
  );
}

export interface FlowCanvasDataProductTextBadgeProps {
  readonly dataProduct: FlowCanvasDataProduct;
}

export function FlowCanvasDataProductTextBadge({
  dataProduct,
}: FlowCanvasDataProductTextBadgeProps) {
  const euiThemeContext = useEuiTheme();
  const badgeTextCss = useMemo(
    () => css`
      ${euiFontSize(euiThemeContext, 'xxs')}
    `,
    [euiThemeContext]
  );

  const dataProductMetricsTip = i18n.translate(
    'xpack.streams.ingestHubFlowCanvas.badgeDataProductMetricsTooltip',
    {
      defaultMessage: 'Metrics',
    }
  );
  const dataProductLogsTip = i18n.translate(
    'xpack.streams.ingestHubFlowCanvas.badgeDataProductLogsTooltip',
    {
      defaultMessage: 'Logs',
    }
  );

  const dataProductMetricsLabel = i18n.translate(
    'xpack.streams.ingestHubFlowCanvas.dataProductBadgeMetricsLabel',
    {
      defaultMessage: 'Metrics',
    }
  );
  const dataProductLogsLabel = i18n.translate(
    'xpack.streams.ingestHubFlowCanvas.dataProductBadgeLogsLabel',
    {
      defaultMessage: 'Logs',
    }
  );

  if (dataProduct === 'metrics') {
    return (
      <EuiToolTip content={dataProductMetricsTip} position="top" delay="regular">
        <EuiBadge color="hollow" css={badgeTextCss}>
          {dataProductMetricsLabel}
        </EuiBadge>
      </EuiToolTip>
    );
  }

  return (
    <EuiToolTip content={dataProductLogsTip} position="top" delay="regular">
      <EuiBadge color="hollow" css={badgeTextCss}>
        {dataProductLogsLabel}
      </EuiBadge>
    </EuiToolTip>
  );
}
