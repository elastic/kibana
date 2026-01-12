/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { EuiTourStepProps } from '@elastic/eui';
import { EuiButton, EuiButtonEmpty, EuiText, EuiTourStep, useEuiTheme } from '@elastic/eui';

import { useDismissableTour } from '../../../../../../../hooks';

export interface EisCostTourProps {
  anchorPosition?: EuiTourStepProps['anchorPosition'];
  ctaLink?: string;
  isCloudEnabled: boolean;
  children: React.ReactElement;
}

export const EisCostTour = ({
  anchorPosition = 'downCenter',
  ctaLink,
  isCloudEnabled,
  children,
}: EisCostTourProps) => {
  const { euiTheme } = useEuiTheme();

  const { isOpen, dismiss } = useDismissableTour('EIS_COSTS');

  if (!isOpen || !isCloudEnabled) {
    return children;
  }

  return (
    <EuiTourStep
      data-test-subj="fleetEisCostTour"
      title={i18n.translate('xpack.fleet.eisCosts.tour.title', {
        defaultMessage: 'AI agents now understand your integrations',
      })}
      maxWidth={`${euiTheme.base * 25}px`}
      content={
        <EuiText>
          <p>
            {i18n.translate('xpack.fleet.eisCosts.tour.description', {
              defaultMessage:
                'Integration documentation and metadata are automatically indexed using Elastic Inference Service (EIS) to help agents understand your environment. Manage settings here.',
            })}
          </p>
        </EuiText>
      }
      isStepOpen={isOpen}
      anchorPosition={anchorPosition}
      step={1}
      stepsTotal={1}
      onFinish={dismiss}
      footerAction={[
        <EuiButtonEmpty
          data-test-subj="fleetEisCostTourCloseBtn"
          onClick={dismiss}
          aria-label={i18n.translate('xpack.fleet.eisCosts.tour.dismiss.aria', {
            defaultMessage: 'Close the cost tour',
          })}
        >
          {i18n.translate('xpack.fleet.eisCosts.tour.dismiss', {
            defaultMessage: 'Dismiss',
          })}
        </EuiButtonEmpty>,
        ...(ctaLink
          ? [
              <EuiButton
                fullWidth={false}
                color="primary"
                size="s"
                href={ctaLink}
                data-test-subj="eisCostsTourCtaBtn"
                target="_blank"
                iconSide="right"
                iconType="popout"
              >
                {i18n.translate('xpack.fleet.eisCosts.tour.cta', {
                  defaultMessage: 'Learn more',
                })}
              </EuiButton>,
            ]
          : []),
      ]}
    >
      {children}
    </EuiTourStep>
  );
};
