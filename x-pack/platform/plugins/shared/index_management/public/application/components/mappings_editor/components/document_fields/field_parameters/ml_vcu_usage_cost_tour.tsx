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

export interface MlVcuUsageCostTourProps {
  anchorPosition?: EuiTourStepProps['anchorPosition'];
  children: React.ReactElement;
}

export const MlVcuUsageCostTour = ({
  anchorPosition = 'downCenter',
  children,
}: MlVcuUsageCostTourProps) => {
  const [isTourVisible, setTourVisible] = useStateWithLocalStorage<boolean>(
    'MlVcuUsageCostTourSkipKey',
    false
  );
  const { docLinks } = useAppContext();

  return (
    <EuiTourStep
      title={
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.parameters.mlCostTour.title"
          defaultMessage="Machine learning usage"
        />
      }
      subtitle={
        <FormattedMessage
          id="xpack.idxMgmt.mappingsEditor.parameters.mlCostTour.subtitle"
          defaultMessage="VCU consumption"
        />
      }
      maxWidth="500px"
      content={
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.idxMgmt.mappingsEditor.parameters.mlCostTour.contents"
              values={{
                additionalCostsLink: (
                  <EuiLink
                    data-test-subj="mlVcuUsageAdditionalCostLink"
                    target="_blank"
                    href={docLinks.links.observability.elasticServerlessSearchManagedLlmUsageCost}
                  >
                    <FormattedMessage
                      id="xpack.idxMgmt.mappingsEditor.parameters.mlCostTour.additionalCosts"
                      defaultMessage="additional costs"
                    />
                  </EuiLink>
                ),
                learnMoreLink: (
                  <EuiLink
                    data-test-subj="mlVcuUsageLearnMoreLink"
                    target="_blank"
                    href={docLinks.links.cloud.elasticsearchBillingManagingCosts}
                  >
                    <FormattedMessage
                      id="xpack.idxMgmt.mappingsEditor.parameters.mlCostTour.learnMore"
                      defaultMessage="Learn more"
                    />
                  </EuiLink>
                ),
              }}
              defaultMessage="Performing inference, NLP tasks, and other ML activities on the Elastic Inference Service (EIS) requires machine learning VCUs that incur {additionalCostsLink}. You can perform these activities on other infrastructures as well. {learnMoreLink}"
            />
          </p>
        </EuiText>
      }
      isStepOpen={!isTourVisible}
      anchorPosition={anchorPosition}
      step={1}
      stepsTotal={1}
      onFinish={() => setTourVisible(true)}
      data-test-subj="mlVcuUsageCostTour"
      footerAction={
        <EuiButtonEmpty
          data-test-subj="mlVcuUsageCostTourCloseBtn"
          onClick={() => setTourVisible(true)}
          aria-label={i18n.translate(
            'xpack.idxMgmt.mappingsEditor.parameters.mlCostTour.closeButton.ariaLabel',
            {
              defaultMessage: 'close the cost tour',
            }
          )}
        >
          <FormattedMessage
            id="xpack.idxMgmt.mappingsEditor.parameters.mlCostTour.closeButton"
            defaultMessage="Ok"
          />
        </EuiButtonEmpty>
      }
      zIndex={1}
    >
      {children}
    </EuiTourStep>
  );
};
