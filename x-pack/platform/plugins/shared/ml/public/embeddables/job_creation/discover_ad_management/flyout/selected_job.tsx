/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FC } from 'react';
import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { useMlApi } from '../../../../application/contexts/kibana';
import { useSelectedJobId } from '../../../../application/components/job_suggestion/use_selected_job_id';

const deselectLabel = i18n.translate('xpack.ml.discoverADManagementFlyout.deselectJobAriaLabel', {
  defaultMessage: 'Deselect job',
});

interface Props {
  indexPattern: string;
}

/** The job whose results are shown on the chart, which is nothing when there is no job selected. */
export const SelectedJob: FC<Props> = ({ indexPattern }) => {
  const mlApi = useMlApi();
  const [selectedJobId, selectJob] = useSelectedJobId(indexPattern);
  const [description, setDescription] = useState<{ jobId: string; text: string }>();

  useEffect(() => {
    if (!selectedJobId) {
      return;
    }
    let isCurrent = true;
    mlApi.jobs
      .jobsSummary([selectedJobId])
      .then((jobs) => {
        const job = jobs.find(({ id }) => id === selectedJobId);
        if (isCurrent && job) setDescription({ jobId: job.id, text: job.description });
      })
      // The id is shown without a description
      .catch(() => {});
    return () => {
      isCurrent = false;
    };
  }, [mlApi, selectedJobId]);

  if (!selectedJobId) {
    return null;
  }

  const text = description?.jobId === selectedJobId ? description.text : undefined;

  return (
    <>
      <EuiPanel
        hasShadow={false}
        hasBorder
        paddingSize="m"
        color="primary"
        data-test-subj="mlDiscoverADManagementSelectedJob"
      >
        <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
          <EuiFlexItem>
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="xpack.ml.discoverADManagementFlyout.selectedJobTitle"
                defaultMessage="Job shown on the chart"
              />
            </EuiText>
            <EuiText size="s">
              <strong>{selectedJobId}</strong>
            </EuiText>
            {text ? (
              <EuiText size="s" color="subdued">
                {text}
              </EuiText>
            ) : null}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={deselectLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="trash"
                color="text"
                aria-label={deselectLabel}
                onClick={() => selectJob(undefined)}
                data-test-subj="mlDiscoverADManagementSelectedJobDeselect"
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiSpacer size="m" />
    </>
  );
};
