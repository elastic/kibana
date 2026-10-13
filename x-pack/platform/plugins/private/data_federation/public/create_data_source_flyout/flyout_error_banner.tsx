/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { KbnDangerCallout } from '@kbn/ui-callout';

export interface FlyoutErrorBannerProps {
  title: string;
  message: string;
  'data-test-subj'?: string;
}

export const FlyoutErrorBanner: FunctionComponent<FlyoutErrorBannerProps> = ({
  title,
  message,
  'data-test-subj': dataTestSubj,
}) => (
  <>
    <KbnDangerCallout
      title={title}
      text={message}
      size="s"
      announceOnMount
      data-test-subj={dataTestSubj}
    />
    <EuiSpacer size="m" />
  </>
);
