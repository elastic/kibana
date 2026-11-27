/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import {
  KbnDangerCallout,
  KbnSuccessCallout,
  KbnWarningCallout,
  type KbnCalloutProps,
} from '@kbn/ui-callout';

export type FlyoutCalloutVariant = 'danger' | 'success' | 'warning';

const CALLOUT_BY_VARIANT = {
  danger: KbnDangerCallout,
  success: KbnSuccessCallout,
  warning: KbnWarningCallout,
} as const satisfies Record<FlyoutCalloutVariant, FunctionComponent<KbnCalloutProps>>;

export interface FlyoutCalloutProps {
  variant: FlyoutCalloutVariant;
  title: string;
  message: string;
  'data-test-subj'?: string;
}

/** Message shown above the actions in a flyout footer. */
export const FlyoutCallout: FunctionComponent<FlyoutCalloutProps> = ({
  variant,
  title,
  message,
  'data-test-subj': dataTestSubj,
}) => {
  const Callout = CALLOUT_BY_VARIANT[variant];

  return (
    <>
      <Callout
        title={title}
        text={message}
        size="s"
        announceOnMount
        data-test-subj={dataTestSubj}
      />
      <EuiSpacer size="m" />
    </>
  );
};
