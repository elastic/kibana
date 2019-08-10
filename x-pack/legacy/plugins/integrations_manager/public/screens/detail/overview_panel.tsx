/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiText, EuiTitle } from '@elastic/eui';
import { IntegrationInfo } from '../../../common/types';

export function OverviewPanel(props: IntegrationInfo) {
  const { description } = props;
  return (
    <Fragment>
      <EuiTitle size="xs">
        <span>About</span>
      </EuiTitle>
      <EuiText>
        <p>{description}</p>
      </EuiText>
    </Fragment>
  );
}
