/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import type { EuiTourStepProps } from '@elastic/eui';
import type { StreamsTourStepId } from './constants';

export type TourStepConfig = Omit<EuiTourStepProps, 'children' | 'isStepOpen' | 'onFinish'> & {
  stepId: StreamsTourStepId;
};

export interface TourStepsOptions {
  attachmentsEnabled: boolean;
}

const tightContentCss = css`
  margin-top: -14px;
`;

const TOUR_SUBTITLE = i18n.translate('xpack.streams.tour.subtitle', {
  defaultMessage: 'Streams',
});

const STREAMS_LIST_STEP: Omit<TourStepConfig, 'step' | 'stepsTotal'> = {
  stepId: 'streams_list',
  subtitle: TOUR_SUBTITLE,
  title: i18n.translate('xpack.streams.tour.streamsList.title', {
    defaultMessage: 'All your data in one place',
  }),
  content: (
    <EuiText size="s" css={tightContentCss}>
      {i18n.translate('xpack.streams.tour.streamsList.content', {
        defaultMessage:
          'Browse all Streams from your data. Select a stream to explore its data, structure, and attached assets.',
      })}
    </EuiText>
  ),
  anchorPosition: 'rightUp',
  offset: 56,
  maxWidth: 360,
};

const RETENTION_STEP: Omit<TourStepConfig, 'step' | 'stepsTotal'> = {
  stepId: 'retention',
  subtitle: TOUR_SUBTITLE,
  title: i18n.translate('xpack.streams.tour.retention.title', {
    defaultMessage: 'Retention',
  }),
  content: (
    <EuiText size="s" css={tightContentCss}>
      {i18n.translate('xpack.streams.tour.retention.content', {
        defaultMessage: 'Control how long your data is kept and when it is removed.',
      })}
    </EuiText>
  ),
  anchorPosition: 'downLeft',
  maxWidth: 360,
};

const PROCESSING_STEP: Omit<TourStepConfig, 'step' | 'stepsTotal'> = {
  stepId: 'processing',
  subtitle: TOUR_SUBTITLE,
  title: i18n.translate('xpack.streams.tour.processing.title', {
    defaultMessage: 'Parse, enrich, and transform your data',
  }),
  content: (
    <EuiText size="s" css={tightContentCss}>
      {i18n.translate('xpack.streams.tour.processing.content', {
        defaultMessage:
          'Define processing rules to clean, structure, and enrich your data. Check the Schema',
      })}
    </EuiText>
  ),
  anchorPosition: 'downCenter',
  maxWidth: 360,
};

const ATTACHMENTS_STEP: Omit<TourStepConfig, 'step' | 'stepsTotal'> = {
  stepId: 'attachments',
  subtitle: TOUR_SUBTITLE,
  title: i18n.translate('xpack.streams.tour.attachments.title', {
    defaultMessage: 'Link dashboards and saved objects',
  }),
  content: (
    <EuiText size="s" css={tightContentCss}>
      {i18n.translate('xpack.streams.tour.attachments.content', {
        defaultMessage:
          'Attach dashboards, visualizations, and other saved objects to your stream for quick access.',
      })}
    </EuiText>
  ),
  anchorPosition: 'downCenter',
  maxWidth: 360,
};

const ADVANCED_STEP: Omit<TourStepConfig, 'step' | 'stepsTotal'> = {
  stepId: 'advanced',
  subtitle: TOUR_SUBTITLE,
  title: i18n.translate('xpack.streams.tour.advanced.title', {
    defaultMessage: 'Fine-tune your stream configuration',
  }),
  content: (
    <EuiText size="s" css={tightContentCss}>
      {i18n.translate('xpack.streams.tour.advanced.content', {
        defaultMessage:
          'Adjust mappings, metadata, and other advanced controls to tailor how your data is structured and maintained',
      })}
    </EuiText>
  ),
  anchorPosition: 'downCenter',
  maxWidth: 360,
};

export function getTourStepsConfig(options: TourStepsOptions): TourStepConfig[] {
  const baseSteps: Array<Omit<TourStepConfig, 'step' | 'stepsTotal'>> = [
    STREAMS_LIST_STEP,
    RETENTION_STEP,
    PROCESSING_STEP,
  ];

  if (options.attachmentsEnabled) {
    baseSteps.push(ATTACHMENTS_STEP);
  }

  baseSteps.push(ADVANCED_STEP);

  const stepsTotal = baseSteps.length;

  return baseSteps.map((stepConfig, index) => ({
    ...stepConfig,
    step: index + 1,
    stepsTotal,
  }));
}
