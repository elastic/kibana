/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import styled from 'styled-components';
import { EuiButton, EuiPopoverTitle, EuiSpacer, EuiText, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import * as i18n from './translations';

const PopoverContentsDiv = styled.div`
  width: 384px;
`;

PopoverContentsDiv.displayName = 'PopoverContentsDiv';

export const UpgradeContents = React.memo(() => {
  return (
    <PopoverContentsDiv data-test-subj="ml-popover-upgrade-contents">
      <EuiPopoverTitle>{i18n.UPGRADE_TITLE}</EuiPopoverTitle>
      <EuiText size="s">
        <FormattedMessage
          id="xpack.siem.components.mlPopup.upgradeDescription"
          defaultMessage="To access SIEM’s anomaly detection features, you must update your license to Platinum, start a free 30-day trial, or spin up a {cloudLink} on AWS, GCP, or Azure. You can then run Machine Learning jobs and view anomalies."
          values={{
            cloudLink: (
              <EuiLink href={`https://www.elastic.co/cloud/`} target="_blank">
                <FormattedMessage
                  id="xpack.siem.components.mlPopup.cloudLink"
                  defaultMessage="cloud deployment"
                />
              </EuiLink>
            ),
          }}
        />
      </EuiText>
      <EuiSpacer />
      <EuiButton
        href="https://www.elastic.co/subscriptions"
        iconType="popout"
        iconSide="right"
        target="_blank"
      >
        {i18n.UPGRADE_BUTTON}
      </EuiButton>
    </PopoverContentsDiv>
  );
});

UpgradeContents.displayName = 'UpgradeContents';
