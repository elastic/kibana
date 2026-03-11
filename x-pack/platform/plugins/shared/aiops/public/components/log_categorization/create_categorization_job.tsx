/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import moment from 'moment';
import { EuiButtonEmpty, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { type CreateCategorizationADJobContext } from '@kbn/ml-ui-actions';
import { FormattedMessage } from '@kbn/i18n-react';

import { i18n } from '@kbn/i18n';
import { CREATE_PATTERN_ANALYSIS_TO_ML_AD_JOB_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';

interface Props {
  dataView: DataView;
  field: DataViewField;
  query: QueryDslQueryContainer;
  earliest: number | undefined;
  latest: number | undefined;
  iconOnly?: boolean;
}

export const CreateCategorizationJobButton: FC<Props> = ({
  dataView,
  field,
  query,
  earliest,
  latest,
  iconOnly = false,
}) => {
  const {
    uiActions,
    application: { capabilities },
  } = useAiopsAppContext();

  const createADJob = () => {
    if (uiActions === undefined) {
      return;
    }

    const triggerOptions: CreateCategorizationADJobContext = {
      dataView,
      field,
      query,
      timeRange: { from: moment(earliest).toISOString(), to: moment(latest).toISOString() },
    };
    uiActions.executeTriggerActions(CREATE_PATTERN_ANALYSIS_TO_ML_AD_JOB_TRIGGER, triggerOptions);
  };

  if (uiActions === undefined || capabilities.ml.canCreateJob === false) {
    return null;
  }

  if (iconOnly) {
    return (
      <EuiToolTip
        content={i18n.translate('xpack.aiops.categorizeFlyout.findAnomalies.tooltip', {
          defaultMessage: 'Create anomaly detection job to find anomalies in patterns',
        })}
        disableScreenReaderOutput
      >
        <EuiButtonIcon
          data-test-subj="aiopsEmbeddableMenuOptionsButton"
          size="s"
          iconType="machineLearningApp"
          onClick={createADJob}
          // @ts-ignore - subdued does work
          color="subdued"
          aria-label={i18n.translate('xpack.aiops.categorizeFlyout.findAnomalies.tooltip', {
            defaultMessage: 'Create anomaly detection job to find anomalies in patterns',
          })}
        />
      </EuiToolTip>
    );
  }

  return (
    <EuiButtonEmpty
      data-test-subj="aiopsLogCategorizationFlyoutAdJobButton"
      onClick={createADJob}
      flush="left"
      iconSide="left"
      iconType={'machineLearningApp'}
    >
      <FormattedMessage
        id="xpack.aiops.categorizeFlyout.findAnomalies"
        defaultMessage="Find anomalies in patterns"
      />
    </EuiButtonEmpty>
  );
};
