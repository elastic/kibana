/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement } from 'react';
import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TourCallout } from './tour_callout';

export const ElasticLlmTourCallout = ({
  children,
  isOpen = true,
  dismissTour,
}: {
  children: ReactElement;
  isOpen?: boolean;
  dismissTour?: () => void;
}) => {
  return (
    <TourCallout
      title={i18n.translate('xpack.aiAssistant.tour.elasticLlmTitle', {
        defaultMessage: 'Elastic-managed LLM connector',
      })}
      subtitle={i18n.translate('xpack.aiAssistant.tour.subtitle', {
        defaultMessage: 'New AI feature!',
      })}
      content={
        <>
          Elastic LLM is our new default, pre-configured LLM connector. It will incur{' '}
          {/* TODO: Update link */}
          <EuiLink href="#" target="_blank" rel="noopener noreferrer" external>
            additional costs
          </EuiLink>
          . You can continue to use other LLM connectors as normal. {/* TODO: Update link */}
          <EuiLink href="#" target="_blank" rel="noopener noreferrer" external>
            Learn more
          </EuiLink>
        </>
      }
      step={1}
      stepsTotal={1}
      anchorPosition="downLeft"
      isOpen={isOpen}
      hasArrow
      footerButtonLabel={i18n.translate('xpack.aiAssistant.tour.footerButtonLabel', {
        defaultMessage: 'Ok',
      })}
      dismissTour={dismissTour}
    >
      {children}
    </TourCallout>
  );
};
