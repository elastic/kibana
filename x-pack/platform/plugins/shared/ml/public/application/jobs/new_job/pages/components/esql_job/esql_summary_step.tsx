/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiDescriptionList, EuiFormRow, EuiSpacer, EuiSwitch, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { EsqlDetectorConfig } from '../../../common/job_creator/esql_job_creator';
import { useEsqlWizardContext } from './esql_wizard_context';
import { describeDetector } from './esql_detector_functions';
import { EsqlPreviewPanel } from './esql_preview_panel';
import { EsqlCreateFlow } from './esql_create_flow';

const describeDetectorRow = (detector: EsqlDetectorConfig): string => {
  const base = describeDetector({ functionName: detector.function, field: detector.field });
  const parts: string[] = [];

  if (detector.byField) {
    parts.push(
      i18n.translate('xpack.ml.esqlJob.summary.byFieldFragment', {
        defaultMessage: 'by {field}',
        values: { field: detector.byField },
      })
    );
  }
  if (detector.overField) {
    parts.push(
      i18n.translate('xpack.ml.esqlJob.summary.overFieldFragment', {
        defaultMessage: 'over {field}',
        values: { field: detector.overField },
      })
    );
  }
  if (detector.partitionField) {
    parts.push(
      i18n.translate('xpack.ml.esqlJob.summary.partitionFieldFragment', {
        defaultMessage: 'partition {field}',
        values: { field: detector.partitionField },
      })
    );
  }

  return parts.length === 0 ? base : `${base} ${parts.join(' ')}`;
};

/**
 * Step 4 (final) of the staged ES|QL wizard (LEAD DECISION 2026-09-29,
 * g2sz.10): a read-only summary of the configuration collected across the
 * previous steps, plus the bounded-window preview panel and the
 * create/open/start-in-real-time action (`EsqlCreateFlow`).
 */
export const EsqlSummaryStep = () => {
  const { state, setContinueInRealTime } = useEsqlWizardContext();

  const listItems = [
    {
      title: i18n.translate('xpack.ml.esqlJob.summary.jobIdTitle', { defaultMessage: 'Job ID' }),
      description: state.jobId,
    },
    {
      title: i18n.translate('xpack.ml.esqlJob.summary.descriptionTitle', {
        defaultMessage: 'Description',
      }),
      description: state.jobDescription || '-',
    },
    {
      title: i18n.translate('xpack.ml.esqlJob.summary.groupsTitle', { defaultMessage: 'Groups' }),
      description: state.jobGroups.length > 0 ? state.jobGroups.join(', ') : '-',
    },
    {
      title: i18n.translate('xpack.ml.esqlJob.summary.sourceTimeFieldTitle', {
        defaultMessage: 'Source time field',
      }),
      description: state.sourceTimeField,
    },
    {
      title: i18n.translate('xpack.ml.esqlJob.summary.bucketSpanTitle', {
        defaultMessage: 'Bucket span',
      }),
      description: state.bucketSpan,
    },
    {
      title: i18n.translate('xpack.ml.esqlJob.summary.detectorsTitle', {
        defaultMessage: 'Detectors',
      }),
      description: state.detectors.map(describeDetectorRow).join(', ') || '-',
    },
    {
      title: i18n.translate('xpack.ml.esqlJob.summary.influencersTitle', {
        defaultMessage: 'Influencers',
      }),
      description: state.influencers.join(', ') || '-',
    },
  ];

  return (
    <div data-test-subj="mlEsqlSummaryStep">
      <EuiTitle size="s">
        <h2>{i18n.translate('xpack.ml.esqlJob.summary.title', { defaultMessage: 'Summary' })}</h2>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiDescriptionList listItems={listItems} type="column" data-test-subj="mlEsqlSummaryList" />
      <EuiSpacer size="l" />
      <EsqlPreviewPanel />
      <EuiSpacer size="l" />
      <EuiFormRow
        helpText={i18n.translate('xpack.ml.esqlJob.summary.continueInRealTimeHelp', {
          defaultMessage:
            'When on, the datafeed analyzes the selected range and then keeps running on new data. When off, it only analyzes the selected range and the job closes when that is done.',
        })}
        fullWidth
      >
        <EuiSwitch
          label={i18n.translate('xpack.ml.esqlJob.summary.continueInRealTimeLabel', {
            defaultMessage: 'Continue in real time after the selected range',
          })}
          checked={state.continueInRealTime}
          onChange={(event) => setContinueInRealTime(event.target.checked)}
          data-test-subj="mlEsqlContinueInRealTimeSwitch"
        />
      </EuiFormRow>
      <EsqlCreateFlow />
    </div>
  );
};
