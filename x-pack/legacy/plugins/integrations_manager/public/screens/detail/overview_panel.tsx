/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { PackageInfo } from '../../../common/types';
import { Screenshots } from './screenshots';
import { MarkdownDescription } from './markdown_description';

export function OverviewPanel(props: PackageInfo) {
  const { description, screenshots } = props;
  // i expect to get the path from props
  const readmePath = '/package/coredns-1.0.1/docs/README.md';
  return (
    <Fragment>
      <EuiTitle size="s">
        <h3>About</h3>
      </EuiTitle>
      <EuiText>
        <p>{description}</p>
        {readmePath && <MarkdownDescription path={readmePath} />}
      </EuiText>
      <EuiSpacer size="xl" />
      {screenshots && <Screenshots images={screenshots} />}
    </Fragment>
  );
}
