/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSpacer } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

export const NotInDocsContent: FC = () => (
  <Fragment>
    <EuiSpacer size="xxl" />
    <EuiFlexGroup justifyContent="spaceAround">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" justifyContent="spaceAround">
          <EuiFlexItem grow={false}>
            <EuiIcon type="alert" />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFlexGroup style={{ padding: '0px 16px', textAlign: 'center' }}>
          <EuiFlexItem grow={false}>
            <FormattedMessage
              id="xpack.ml.fieldDataCard.fieldNotInDocsLabel"
              defaultMessage="This field does not appear in any documents for the selected time range"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  </Fragment>
);
