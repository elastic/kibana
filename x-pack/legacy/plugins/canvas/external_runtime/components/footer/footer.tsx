/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Scrubber } from './scrubber.container';
import { Title } from './title.container';
import { PageControls } from './page_controls.container';
import { Settings } from './settings';

import css from './footer.module.scss';

export const FOOTER_HEIGHT = 48;

interface Props {
  isAutohide?: boolean;
  isHidden?: boolean;
}

/**
 * The footer of the Embedded Workpad.
 */
export const Footer = ({ isAutohide = false, isHidden = false }: Props) => {
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
