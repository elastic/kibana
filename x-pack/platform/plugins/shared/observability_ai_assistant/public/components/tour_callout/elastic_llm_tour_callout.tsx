/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactElement } from 'react';
import { EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { TourCallout } from './tour_callout';
import { useKibana } from '../../hooks/use_kibana';

export const ElasticLlmTourCallout = ({
  children,
  isOpen = true,
  zIndex,
  dismissTour,
}: {
  children: ReactElement;
  isOpen?: boolean;
  zIndex?: number;
  dismissTour?: () => void;
}) => {
  const { docLinks } = useKibana().services;

  return (
    <TourCallout
      title={i18n.translate('xpack.observabilityAiAssistant.tour.elasticLlmTitle', {
        defaultMessage: 'Elastic Managed LLM connector now available',
      })}
      subtitle={i18n.translate('xpack.observabilityAiAssistant.tour.subtitle', {
        defaultMessage: 'New AI feature!',
      })}
      content={
        <FormattedMessage
          id="xpack.observabilityAiAssistant.tour.elasticLlmContent"
          defaultMessage="This new default LLM connector is optimized for Elastic AI features (<costLink>additional costs incur</costLink>). You can continue using existing LLM connectors if you prefer. <learnMoreLink>Learn more</learnMoreLink>"
          values={{
            costLink: (...chunks: React.ReactNode[]) => (
              <EuiLink
                href={docLinks?.links?.observability?.elasticManagedLlmUsageCost}
                target="_blank"
                rel="noopener noreferrer"
                external
              >
                {chunks}
              </EuiLink>
            ),
            learnMoreLink: (...chunks: React.ReactNode[]) => (
              <EuiLink
                href={docLinks?.links?.observability?.elasticManagedLlm}
                target="_blank"
                rel="noopener noreferrer"
                external
              >
                {chunks}
              </EuiLink>
            ),
          }}
        />
      }
      step={1}
      stepsTotal={1}
      anchorPosition="downLeft"
      isOpen={isOpen}
      hasArrow
      footerButtonLabel={i18n.translate('xpack.observabilityAiAssistant.tour.footerButtonLabel', {
        defaultMessage: 'Ok',
      })}
      zIndex={zIndex}
      dismissTour={dismissTour}
    >
      {children}
    </TourCallout>
  );
};
