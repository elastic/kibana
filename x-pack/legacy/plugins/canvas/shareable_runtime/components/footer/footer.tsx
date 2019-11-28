/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useCanvasShareableState } from '../../context';
import { Scrubber } from './scrubber';
import { Title } from './title';
import { PageControls } from './page_controls';
import { Settings } from './settings';

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
export const FooterComponent: FC<Props> = ({ isAutohide = false, isHidden = false }) => {
  const { root, bar, title } = css;

  return (
    <div className={root} style={{ height: FOOTER_HEIGHT }}>
      <Scrubber />
      <div className={bar} style={{ bottom: isAutohide && isHidden ? -FOOTER_HEIGHT : 0 }}>
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem className={title}>
            <Title />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s">
              <PageControls />
              <Settings />
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  );
};

/**
 * A store-connected container for the `Footer` component.
 */
export const Footer: FC<Pick<Props, 'isHidden'>> = ({ isHidden = false }) => {
  const [{ workpad, settings }] = useCanvasShareableState();

  if (!workpad) {
    return null;
  }

  const { toolbar } = settings;
  const { isAutohide } = toolbar;

  return <FooterComponent {...{ isHidden, isAutohide }} />;
};
