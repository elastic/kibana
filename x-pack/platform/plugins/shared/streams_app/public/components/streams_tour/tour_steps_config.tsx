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
import { TOUR_STEPS_TOTAL } from './constants';


export type TourStepConfig = Omit<EuiTourStepProps, 'children' | 'isStepOpen' | 'onFinish'>;

const tightContentCss = css`
  margin-top: -14px;
`;

const TOUR_SUBTITLE = i18n.translate('xpack.streams.tour.subtitle', {
  defaultMessage: 'Streams',
});


export const getTourStepsConfig = (): TourStepConfig[] => [
  {
    step: 1,
    stepsTotal: TOUR_STEPS_TOTAL,
    subtitle: TOUR_SUBTITLE,
    title: i18n.translate('xpack.streams.tour.step1.title', {
      defaultMessage: 'All your data in one place',
    }),
    content: (
      <EuiText size="s" css={tightContentCss}>
        {i18n.translate('xpack.streams.tour.step1.content', {
          defaultMessage:
            'Browse all Streams from your data. Select a stream to explore its data, structure, and attached assets.',
        })}
      </EuiText>
    ),
    anchorPosition: 'rightUp',
    offset: 56,
    maxWidth: 360,
  },
  {
    step: 2,
    stepsTotal: TOUR_STEPS_TOTAL,
    subtitle: TOUR_SUBTITLE,
    title: i18n.translate('xpack.streams.tour.step2.title', {
      defaultMessage: 'Retention',
    }),
    content: (
      <EuiText size="s" css={tightContentCss}>
        {i18n.translate('xpack.streams.tour.step2.content', {
          defaultMessage: 'Control how long your data is kept and when it is removed.',
        })}
      </EuiText>
    ),
    anchorPosition: 'downLeft',
    maxWidth: 360,
  },
  {
    step: 3,
    stepsTotal: TOUR_STEPS_TOTAL,
    subtitle: TOUR_SUBTITLE,
    title: i18n.translate('xpack.streams.tour.step3.title', {
      defaultMessage: 'Parse, enrich, and transform your data',
    }),
    content: (
      <EuiText size="s" css={tightContentCss}>
        {i18n.translate('xpack.streams.tour.step3.content', {
          defaultMessage:
            'Define processing rules to clean, structure, and enrich your data. Check the Schema',
        })}
      </EuiText>
    ),
    anchorPosition: 'downCenter',
    maxWidth: 360,
  },
  {
    step: 4,
    stepsTotal: TOUR_STEPS_TOTAL,
    subtitle: TOUR_SUBTITLE,
    title: i18n.translate('xpack.streams.tour.step4.title', {
      defaultMessage: 'Fine-tune your stream configuration',
    }),
    content: (
      <EuiText size="s" css={tightContentCss}>
        {i18n.translate('xpack.streams.tour.step4.content', {
          defaultMessage:
            'Adjust mappings, metadata, and other advanced controls to tailor how your data is structured and maintained',
        })}
      </EuiText>
    ),
    anchorPosition: 'downCenter',
    maxWidth: 360,
  },
];

