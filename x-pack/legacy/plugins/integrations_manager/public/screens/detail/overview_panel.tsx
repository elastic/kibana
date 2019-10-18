/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { PackageInfo } from '../../../common/types';
import { Screenshots } from './screenshots';

export function OverviewPanel(props: PackageInfo) {
  const { description, screenshots } = props;
  return (
    <Fragment>
      <EuiTitle size="s">
        <h3>About</h3>
      </EuiTitle>
      <EuiText>
        <p>{description}</p>
        <p>Still need a) longer descriptions b) component to show/hide</p>
      </EuiText>
      <EuiSpacer size="xl" />
      {screenshots && <Screenshots images={screenshots} />}
    </Fragment>
  );
}
