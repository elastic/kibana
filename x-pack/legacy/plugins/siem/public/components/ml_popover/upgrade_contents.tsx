/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import styled from 'styled-components';
import { EuiButton, EuiPopoverTitle, EuiSpacer, EuiText } from '@elastic/eui';
import * as i18n from './translations';

const PopoverContentsDiv = styled.div`
  width: 384px;
`;

PopoverContentsDiv.displayName = 'PopoverContentsDiv';

export const UpgradeContents = React.memo(() => {
  return (
    <PopoverContentsDiv data-test-subj="ml-popover-upgrade-contents">
      <EuiPopoverTitle>{i18n.UPGRADE_TITLE}</EuiPopoverTitle>
      <EuiText size="s">{i18n.UPGRADE_DESCRIPTION}</EuiText>
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
