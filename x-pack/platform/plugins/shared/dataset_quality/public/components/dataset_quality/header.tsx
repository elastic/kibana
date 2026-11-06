/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AppHeader } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { DEGRADED_DOCS_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import React, { useMemo, useState } from 'react';
import { createAlertText, datasetQualityAppTitle } from '../../../common/translations';
import { AlertFlyout } from '../../alerts/alert_flyout';
import { getAlertingCapabilities } from '../../alerts/get_alerting_capabilities';
import { useKibanaContextForPlugin } from '../../utils';
import { DEFAULT_DATASET_TYPE } from '../../../common/constants';
import { useDatasetQualityFilters } from '../../hooks/use_dataset_quality_filters';

const DATA_STREAM_NAMING_SCHEME_URL = 'https://ela.st/data-stream-naming-scheme';

// Allow for lazy loading
// eslint-disable-next-line import/no-default-export
export default function Header() {
  const {
    services: { application, alerting },
  } = useKibanaContextForPlugin();
  const { capabilities } = application;

  const [ruleType, setRuleType] = useState<typeof DEGRADED_DOCS_RULE_TYPE_ID | null>(null);

  const { isAlertingAvailable } = getAlertingCapabilities(alerting, capabilities);
  const { isDatasetQualityAllSignalsAvailable, authorizedDatasetTypes } =
    useDatasetQualityFilters();
  const validTypes = useMemo(
    () => (isDatasetQualityAllSignalsAvailable ? authorizedDatasetTypes : [DEFAULT_DATASET_TYPE]),
    [isDatasetQualityAllSignalsAvailable, authorizedDatasetTypes]
  );

  const description = useMemo(
    () => ({
      text: i18n.translate('xpack.datasetQuality.appDescription', {
        defaultMessage:
          'Monitor the data set quality for {types} data streams that follow the data stream naming scheme.',
        values: { types: validTypes.join(', ') },
      }),
      learnMoreUrl: DATA_STREAM_NAMING_SCHEME_URL,
    }),
    [validTypes]
  );

  const menu = useMemo(
    () =>
      isAlertingAvailable && validTypes.length
        ? {
            primaryActionItem: {
              id: 'createAlert',
              label: createAlertText,
              iconType: 'bell' as const,
              testId: 'datasetQualityDetailsHeaderButton',
              run: () => {
                setRuleType(DEGRADED_DOCS_RULE_TYPE_ID);
              },
            },
          }
        : undefined,
    [isAlertingAvailable, validTypes.length]
  );

  return (
    <>
      <AppHeader
        title={datasetQualityAppTitle}
        badges={[
          {
            label: betaBadgeLabel,
            color: 'hollow',
            tooltip: betaBadgeDescription,
          },
        ]}
        description={description}
        menu={menu}
        spacing="bleed"
      />
      {ruleType === DEGRADED_DOCS_RULE_TYPE_ID && (
        <AlertFlyout closeFlyout={() => setRuleType(null)} />
      )}
    </>
  );
}

const betaBadgeLabel = i18n.translate('xpack.datasetQuality.betaBadgeLabel', {
  defaultMessage: 'Beta',
});

const betaBadgeDescription = i18n.translate('xpack.datasetQuality.betaBadgeDescription', {
  defaultMessage:
    'This feature is currently in beta. If you encounter any bugs or have feedback, we’d love to hear from you. Please open a support issue and/or visit our discussion forum.',
});
