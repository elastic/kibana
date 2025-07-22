/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBetaBadge, EuiButton, EuiCode, EuiLink, EuiPageHeader } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { DEGRADED_DOCS_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { default as React, useMemo, useState } from 'react';
import { KNOWN_TYPES } from '../../../common/constants';
import { createAlertText, datasetQualityAppTitle } from '../../../common/translations';
import { AlertFlyout } from '../../alerts/alert_flyout';
import { getAlertingCapabilities } from '../../alerts/get_alerting_capabilities';
import { useKibanaContextForPlugin } from '../../utils';
import { DEFAULT_DATASET_TYPE } from '../../../common/constants';
import { useDatasetQualityFilters } from '../../hooks/use_dataset_quality_filters';

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function Header() {
  const {
    services: { application, alerting },
  } = useKibanaContextForPlugin();
  const { capabilities } = application;

  const [ruleType, setRuleType] = useState<typeof DEGRADED_DOCS_RULE_TYPE_ID | null>(null);

  const { isAlertingAvailable } = getAlertingCapabilities(alerting, capabilities);
  const { isDatasetQualityAllSignalsAvailable } = useDatasetQualityFilters();
  const validTypes = useMemo(
    () => (isDatasetQualityAllSignalsAvailable ? KNOWN_TYPES : [DEFAULT_DATASET_TYPE]),
    [isDatasetQualityAllSignalsAvailable]
  );

  return (
    <EuiPageHeader
      bottomBorder
      pageTitle={
        <>
          {datasetQualityAppTitle}
          &nbsp;
          <EuiBetaBadge
            label={betaBadgeLabel}
            title={betaBadgeLabel}
            tooltipContent={betaBadgeDescription}
          />
        </>
      }
      description={
        <FormattedMessage
          id="xpack.datasetQuality.appDescription"
          defaultMessage="Monitor the data set quality for {types} data streams that follow the {dsNamingSchemeLink}."
          values={{
            types: validTypes.map((type, index) => {
              return (
                <>
                  {index > 0 && ', '}
                  <EuiCode>{type}</EuiCode>
                </>
              );
            }),
            dsNamingSchemeLink: (
              <EuiLink
                data-test-subj="datasetQualityAppDescriptionDsNamingSchemeLink"
                href="https://ela.st/data-stream-naming-scheme"
                target="_blank"
                rel="noopener"
              >
                <FormattedMessage
                  id="xpack.datasetQuality.appDescription.dsNamingSchemeLinkText"
                  defaultMessage="Data stream naming scheme"
                />
              </EuiLink>
            ),
          }}
        />
      }
      rightSideItems={
        isAlertingAvailable
          ? [
              <>
                <EuiButton
                  data-test-subj="datasetQualityDetailsHeaderButton"
                  onClick={() => {
                    setRuleType(DEGRADED_DOCS_RULE_TYPE_ID);
                  }}
                  iconType="bell"
                >
                  {createAlertText}
                </EuiButton>
                <AlertFlyout
                  addFlyoutVisible={!!ruleType}
                  setAddFlyoutVisibility={(visible) => {
                    if (!visible) {
                      setRuleType(null);
                    }
                  }}
                />
              </>,
            ]
          : undefined
      }
    />
  );
}

const betaBadgeLabel = i18n.translate('xpack.datasetQuality.betaBadgeLabel', {
  defaultMessage: 'Beta',
});

const betaBadgeDescription = i18n.translate('xpack.datasetQuality.betaBadgeDescription', {
  defaultMessage:
    'This feature is currently in beta. If you encounter any bugs or have feedback, we’d love to hear from you. Please open a support issue and/or visit our discussion forum.',
});
