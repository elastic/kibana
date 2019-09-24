/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ScrubberContainer } from './scrubber.container';
import { TitleContainer } from './title.container';
import { PageControlsContainer } from './page_controls.container';
import { SettingsContainer } from './settings';

import css from './footer.module.scss';

export const FOOTER_HEIGHT = 48;

export interface Props {
  /**
   * True if the footer should be hidden when not interacted with, false otherwise.
   */
  isAutohide?: boolean;

  /**
   * True if the footer should be hidden, false otherwise.
   */
  isHidden?: boolean;
}

/**
 * The Footer of the Shareable Canvas Workpad.
 */
export const Footer = ({ isAutohide = false, isHidden = false }: Props) => {
  const { root, bar, title } = css;

  return (
    <div className={root} style={{ height: FOOTER_HEIGHT }}>
      <ScrubberContainer />
      <div className={bar} style={{ bottom: isAutohide && isHidden ? -FOOTER_HEIGHT : 0 }}>
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem className={title}>
            <TitleContainer />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              <PageControlsContainer />
              <SettingsContainer />
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  );
};
