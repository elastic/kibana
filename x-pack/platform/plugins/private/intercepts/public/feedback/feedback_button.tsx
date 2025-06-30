/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart, OverlayRef } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { EuiHeaderSectionItemButton, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { LicensingPluginStart } from '@kbn/licensing-plugin/public';
import { FeedbackFlyout } from './feedback_flyout';

interface Props {
  core: CoreStart;
  getLicense: LicensingPluginStart['getLicense'];
}

export const FeedbackButton = ({ core, getLicense }: Props) => {
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
        <FeedbackFlyout core={core} closeFlyout={closeFlyout} getLicense={getLicense} />,
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
      aria-controls="keyPadMenu"
      aria-haspopup="true"
      aria-label={i18n.translate('xpack.intercept.giveFeedbackButton.label', {
        defaultMessage: 'Give feedback',
      })}
      onClick={toogleFlyout}
    >
      <EuiIcon type="comment" />
    </EuiHeaderSectionItemButton>
  );
};
