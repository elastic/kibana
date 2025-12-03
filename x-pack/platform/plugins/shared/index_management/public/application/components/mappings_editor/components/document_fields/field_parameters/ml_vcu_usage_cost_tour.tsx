/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiTourStepProps } from '@elastic/eui';
import { EuiButtonEmpty, EuiLink, EuiText, EuiTourStep } from '@elastic/eui';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useStateWithLocalStorage } from '../../../../../hooks/use_state_with_localstorage';
import { useAppContext } from '../../../../../app_context';

export interface TokenConsumptionCostTourProps {
  anchorPosition?: EuiTourStepProps['anchorPosition'];
  children: React.ReactElement;
}

export const TokenConsumptionCostTour = ({
  anchorPosition = 'downCenter',
  children,
}: TokenConsumptionCostTourProps) => {
  const [isTourVisible, setTourVisible] = useStateWithLocalStorage<boolean>(
    'TokenConsumptionCostTourSkipKey',
    false
  );
  const { docLinks } = useAppContext();

  return (
    <EuiTourStep
      title={
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.parameters.tokenConsumptionCostTour.title"
          defaultMessage="Inference usage"
        />
      }
      subtitle={
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.parameters.tokenConsumptionCostTour.subtitle"
          defaultMessage="Token consumption"
        />
      }
      maxWidth="400px"
      content={
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.idxMgmt.mappingsEditor.parameters.tokenConsumptionCostTour.contents"
              values={{
                additionalCostsLink: (
                  <EuiLink
                    data-test-subj="tokenConsumptionAdditionalCostLink"
                    target="_blank"
                    href={docLinks.links.observability.elasticServerlessSearchManagedLlmUsageCost}
                  >
                    <FormattedMessage
                      id="xpack.idxMgmt.mappingsEditor.parameters.tokenConsumptionCostTour.additionalCosts"
                      defaultMessage="additional costs"
                    />
                  </EuiLink>
                ),
                learnMoreLink: (
                  <EuiLink
                    data-test-subj="tokenConsumptionLearnMoreLink"
                    target="_blank"
                    href={docLinks.links.cloud.elasticsearchBillingManagingCosts}
                  >
                    <FormattedMessage
                      id="xpack.idxMgmt.mappingsEditor.parameters.tokenConsumptionCostTour.learnMore"
                      defaultMessage="Learn more"
                    />
                  </EuiLink>
                ),
              }}
              defaultMessage="Performing inference, NLP tasks, and other ML activities on the Elastic Inference Service (EIS) incurs {additionalCostsLink} for tokens."
            />
          </p>
        </EuiText>
      }
      isStepOpen={!isTourVisible}
      anchorPosition={anchorPosition}
      step={1}
      stepsTotal={1}
      onFinish={() => setTourVisible(true)}
      data-test-subj="tokenConsumptionCostTour"
      footerAction={
        <EuiButtonEmpty
          data-test-subj="tokenConsumptionCostTourCloseBtn"
          onClick={() => setTourVisible(true)}
          aria-label={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.parameters.tokenConsumptionCostTour.closeButton.ariaLabel',
            {
              defaultMessage: 'Close the cost tour',
            }
          )}
        >
          <FormattedMessage
            id="xpack.idxMgmt.mappingsEditor.parameters.tokenConsumptionCostTour.closeButton"
            defaultMessage="Ok"
          />
        </EuiButtonEmpty>
      }
    >
      {children}
    </EuiTourStep>
  );
};
