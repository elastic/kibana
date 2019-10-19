/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiText, EuiSpacer, EuiButton } from '@elastic/eui';

import { ComponentStrings } from '../../../../../i18n';

import { OnDownloadFn } from './share_website_flyout';

const { ShareWebsiteRuntimeStep: strings } = ComponentStrings;

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
