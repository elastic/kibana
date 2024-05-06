/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiText, EuiSpacer, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CANVAS } from '../../../../../i18n/constants';

import { OnDownloadFn } from './flyout';

const strings = {
  getDownloadLabel: () =>
    i18n.translate('xpack.canvas.shareWebsiteFlyout.runtimeStep.downloadLabel', {
      defaultMessage: 'Download runtime',
    }),
  getStepDescription: () =>
    i18n.translate('xpack.canvas.shareWebsiteFlyout.runtimeStep.description', {
      defaultMessage:
        'In order to render a Shareable Workpad, you also need to include the {CANVAS} Shareable Workpad Runtime. You can skip this step if the runtime is already included on your website.',
      values: {
        CANVAS,
      },
    }),
};

export const RuntimeStep: FC<{ onDownload: OnDownloadFn }> = ({ onDownload }) => (
  <EuiText size="s">
    <p>{strings.getStepDescription()}</p>
    <EuiSpacer size="s" />
    <EuiButton
      onClick={() => {
        onDownload('shareRuntime');
      }}
      size="s"
    >
      {strings.getDownloadLabel()}
    </EuiButton>
  </EuiText>
);
