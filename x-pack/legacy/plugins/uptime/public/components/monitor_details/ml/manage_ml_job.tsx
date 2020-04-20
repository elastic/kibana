/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useState } from 'react';

import { EuiButtonEmpty, EuiContextMenu, EuiIcon, EuiPopover } from '@elastic/eui';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  canDeleteMLJobSelector,
  hasMLJobSelector,
  isMLJobCreatingSelector,
} from '../../../state/selectors';
import { UptimeSettingsContext } from '../../../contexts';
import * as labels from './translations';
import { getMLJobLinkHref } from './ml_job_link';
import { useUrlParams } from '../../../hooks';

interface Props {
  hasMLJob: boolean;
  onEnableJob: () => void;
  onJobDelete: () => void;
}

export const ManageMLJobComponent = ({ hasMLJob, onEnableJob, onJobDelete }: Props) => {
  const [isPopOverOpen, setIsPopOverOpen] = useState(false);

  const { basePath } = useContext(UptimeSettingsContext);

  const canDeleteMLJob = useSelector(canDeleteMLJobSelector);

  const isMLJobCreating = useSelector(isMLJobCreatingSelector);

  const { loading: isMLJobLoading } = useSelector(hasMLJobSelector);

  const [getUrlParams] = useUrlParams();
  const { dateRangeStart, dateRangeEnd } = getUrlParams();

  let { monitorId } = useParams();
  monitorId = atob(monitorId || '');

  const button = (
    <EuiButtonEmpty
      iconType={hasMLJob ? 'arrowDown' : 'machineLearningApp'}
      iconSide={hasMLJob ? 'right' : 'left'}
      onClick={hasMLJob ? () => setIsPopOverOpen(true) : onEnableJob}
      disabled={hasMLJob && !canDeleteMLJob}
      isLoading={isMLJobCreating || isMLJobLoading}
    >
      {hasMLJob ? labels.ANOMALY_DETECTION : labels.ENABLE_ANOMALY_DETECTION}
    </EuiButtonEmpty>
  );

  const panels = [
    {
      id: 0,
      title: labels.MANAGE_ANOMALY_DETECTION,
      items: [
        {
          name: labels.EXPLORE_IN_ML_APP,
          icon: <EuiIcon type="dataVisualizer" size="m" />,
          href: getMLJobLinkHref({
            basePath,
            monitorId,
            dateRange: { from: dateRangeStart, to: dateRangeEnd },
          }),
          target: '_blank',
        },
        {
          name: labels.DISABLE_ANOMALY_DETECTION,
          icon: <EuiIcon type="trash" size="m" />,
          onClick: () => {
            setIsPopOverOpen(false);
            onJobDelete();
          },
        },
      ],
    },
  ];

  return (
    <EuiPopover button={button} isOpen={isPopOverOpen} closePopover={() => setIsPopOverOpen(false)}>
      <EuiContextMenu initialPanelId={0} panels={panels} />
    </EuiPopover>
  );
};
