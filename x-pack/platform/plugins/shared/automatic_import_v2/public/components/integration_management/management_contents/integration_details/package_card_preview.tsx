/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useEuiTheme, EuiCard, EuiIcon, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { css } from '@emotion/react';
import { useIntegrationForm } from '../../forms/integration_form';
import * as i18n from './translations';

const useCardCss = () => {
  const { euiTheme } = useEuiTheme();
  return {
    card: css`
      margin-top: calc(
        ${euiTheme.size.m} + 7px
      ); // To align with title input that has a margin-top of 4px to the label

      min-height: 127px;

      [class*='euiCard__content'] {
        display: flex;
        flex-direction: column;
        block-size: 100%;
      }

      [class*='euiCard__title'],
      [class*='euiCard__description'] {
        overflow-wrap: break-word;
        word-break: break-word;
      }

      [class*='euiCard__description'] {
        flex-grow: 1;
      }
    `,
    panel: css`
      width: 100%;
      max-width: 234px;

      @media (max-width: ${euiTheme.breakpoint.m}px) {
        max-width: 100%;
      }
    `,
  };
};

interface IntegrationSettings {
  title: string;
  description: string;
  logo: string;
  name: string;
}

type PackageCardPreviewProps = Partial<IntegrationSettings>;

export const PackageCardPreview = React.memo<PackageCardPreviewProps>(({}) => {
  const cardCss = useCardCss();
  const { formData } = useIntegrationForm();

  const { title, description, logo } = formData;

  return (
    <EuiFlexItem grow={false} css={cardCss.panel}>
      <EuiPanel paddingSize="l" color="subdued" hasShadow={false} borderRadius="m">
        <EuiCard
          css={cardCss.card}
          layout="horizontal"
          title={title ?? ''}
          description={description ?? ''}
          titleSize="xs"
          hasBorder
          icon={
            <EuiIcon size={'xl'} type={logo ? `data:image/svg+xml;base64,${logo}` : 'package'} />
          }
          betaBadgeProps={{
            label: i18n.PREVIEW,
            tooltipContent: i18n.PREVIEW_TOOLTIP,
          }}
        />
      </EuiPanel>
    </EuiFlexItem>
  );
});
PackageCardPreview.displayName = 'PackageCardPreview';
