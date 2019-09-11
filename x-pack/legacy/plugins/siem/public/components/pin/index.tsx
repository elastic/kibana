/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon } from '@elastic/eui';
import { noop } from 'lodash/fp';
import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import * as i18n from '../../components/timeline/body/translations';

export type PinIcon = 'pin' | 'pinFilled';

export const getPinIcon = (pinned: boolean): PinIcon => (pinned ? 'pinFilled' : 'pin');

interface Props {
  allowUnpinning: boolean;
  pinned: boolean;
  onClick?: () => void;
}

const PinButtonIcon = styled(EuiButtonIcon)<{ pinned: string }>`
  svg {
    ${({ pinned, theme }) => (pinned === 'true' ? `fill: ${theme.eui.euiColorPrimary};` : '')}
    height: 19px;
    ${({ pinned }) => `left: ${pinned === 'true' ? '-2' : '-1'}`}px;
    position: relative;
    width: 19px;
  }
`;

export const Pin = pure<Props>(({ allowUnpinning, pinned, onClick = noop }) => (
  <PinButtonIcon
    aria-label={pinned ? i18n.PINNED : i18n.UNPINNED}
    isDisabled={allowUnpinning ? false : true}
    color={pinned ? 'primary' : 'subdued'}
    data-test-subj="pin"
    onClick={onClick}
    pinned={pinned.toString()}
    role="button"
    size="m"
    iconType={getPinIcon(pinned)}
  />
));

Pin.displayName = 'Pin';
