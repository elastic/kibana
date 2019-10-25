/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiSpacer, EuiText } from '@elastic/eui';
import { PackageInfo } from '../../../common/types';
import { Screenshots } from './screenshots';
import { Readme } from './readme';

export function OverviewPanel(props: PackageInfo) {
  const { screenshots, readme } = props;
  return (
    <Fragment>
      <EuiText>{readme && <Readme readmePath={readme} />}</EuiText>
      <EuiSpacer size="xl" />
      {screenshots && <Screenshots images={screenshots} />}
    </Fragment>
  );
}
