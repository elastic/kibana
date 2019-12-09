/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonIcon, IconSize } from '@elastic/eui';
import { noop } from 'lodash/fp';
import * as React from 'react';

import * as i18n from '../../components/timeline/body/translations';

export type PinIcon = 'pin' | 'pinFilled';

export const getPinIcon = (pinned: boolean): PinIcon => (pinned ? 'pinFilled' : 'pin');

interface Props {
  allowUnpinning: boolean;
  iconSize?: IconSize;
  onClick?: () => void;
  pinned: boolean;
}

export const Pin = React.memo<Props>(
  ({ allowUnpinning, iconSize = 'm', onClick = noop, pinned }) => (
    <EuiButtonIcon
      aria-label={pinned ? i18n.PINNED : i18n.UNPINNED}
      data-test-subj="pin"
      iconSize={iconSize}
      iconType={getPinIcon(pinned)}
      isDisabled={allowUnpinning ? false : true}
      onClick={onClick}
    />
  )
);

Pin.displayName = 'Pin';
