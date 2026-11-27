/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { JOB_TYPE } from '../../../../common/constants/new_job';
import type { JobSuggestion } from '../../../../common/types/job_suggestions';

const JOB_TYPE_LABELS: Record<JOB_TYPE, string> = {
  [JOB_TYPE.SINGLE_METRIC]: i18n.translate('xpack.ml.suggestADJobsFlyout.jobType.singleMetric', {
    defaultMessage: 'Single metric',
  }),
  [JOB_TYPE.MULTI_METRIC]: i18n.translate('xpack.ml.suggestADJobsFlyout.jobType.multiMetric', {
    defaultMessage: 'Multi-metric',
  }),
  [JOB_TYPE.POPULATION]: i18n.translate('xpack.ml.suggestADJobsFlyout.jobType.population', {
    defaultMessage: 'Population',
  }),
  [JOB_TYPE.ADVANCED]: i18n.translate('xpack.ml.suggestADJobsFlyout.jobType.advanced', {
    defaultMessage: 'Advanced',
  }),
  [JOB_TYPE.CATEGORIZATION]: i18n.translate('xpack.ml.suggestADJobsFlyout.jobType.categorization', {
    defaultMessage: 'Categorization',
  }),
  [JOB_TYPE.RARE]: i18n.translate('xpack.ml.suggestADJobsFlyout.jobType.rare', {
    defaultMessage: 'Rare',
  }),
  [JOB_TYPE.GEO]: i18n.translate('xpack.ml.suggestADJobsFlyout.jobType.geo', {
    defaultMessage: 'Geo',
  }),
};

interface Props {
  suggestion: JobSuggestion;
}

/** The job type, memory estimate and any validation warning of a suggestion. */
export const SuggestionBadges: FC<Props> = ({ suggestion }) => (
  <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
    <EuiFlexItem grow={false}>
      <EuiBadge color="hollow">{JOB_TYPE_LABELS[suggestion.jobType]}</EuiBadge>
    </EuiFlexItem>
    {suggestion.estimatedModelMemoryLimit ? (
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">
          <FormattedMessage
            id="xpack.ml.suggestADJobsFlyout.memoryBadge"
            defaultMessage="Memory: {memory}"
            values={{ memory: suggestion.estimatedModelMemoryLimit }}
          />
        </EuiBadge>
      </EuiFlexItem>
    ) : null}
    {suggestion.validation.status === 'warning' ? (
      <EuiFlexItem grow={false}>
        <EuiToolTip
          content={i18n.translate('xpack.ml.suggestADJobsFlyout.warningTooltip', {
            defaultMessage:
              'The job validation found something worth reviewing before the job is created.',
          })}
        >
          <EuiBadge color="warning" tabIndex={0}>
            <FormattedMessage
              id="xpack.ml.suggestADJobsFlyout.warningBadge"
              defaultMessage="Review needed"
            />
          </EuiBadge>
        </EuiToolTip>
      </EuiFlexItem>
    ) : null}
  </EuiFlexGroup>
);
