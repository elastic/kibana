/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart, OverlayRef } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { EuiHeaderSectionItemButton, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { FeedbackFlyout } from './flyout';
import { SERVERLESS_FEEDBACK_URL } from './constants';

interface Props {
  core: CoreStart;
  isServerless: boolean;
  getLicense: LicensingPluginStart['getLicense'];
}

export const FeedbackButton = ({ core, isServerless, getLicense }: Props) => {
  let flyoutRef: OverlayRef | null = null;

  const closeFlyout = () => {
    flyoutRef?.close();
    flyoutRef = null;
  };

  const toogleFlyout = () => {
    if (flyoutRef) {
      closeFlyout();
      return;
    }

    flyoutRef = core.overlays.openFlyout(
      toMountPoint(
        <FeedbackFlyout
          getCurrentUser={core.security.authc.getCurrentUser}
          closeFlyout={closeFlyout}
          getLicense={getLicense}
        />,
        core.rendering
      ),
      {
        'data-test-subj': 'feedbackFlyout',
        type: 'push',
        maxWidth: 400,
        hideCloseButton: true,
      }
    );

    flyoutRef.onClose.finally(() => {
      flyoutRef = null;
    });
  };

  return (
    <EuiHeaderSectionItemButton
      data-test-subj="feedbackButton"
      aria-haspopup={!isServerless}
      aria-label={i18n.translate('xpack.intercepts.feedbackButton.ariaLabel', {
        defaultMessage: 'Give feedback',
      })}
      iconType="comment"
      textProps={false}
      onClick={isServerless ? undefined : toogleFlyout}
      href={isServerless ? SERVERLESS_FEEDBACK_URL : undefined}
      target={isServerless ? '_blank' : undefined}
    >
      <EuiText size="s">
        <FormattedMessage id="xpack.intercepts.feedbackButton.text" defaultMessage="Feedback" />
      </EuiText>
    </EuiHeaderSectionItemButton>
  );
};
