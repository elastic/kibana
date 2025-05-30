/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const i18nTexts = {
  noDeprecationIssuesText: i18n.translate('xpack.upgradeAssistant.noDeprecationsMessage', {
    defaultMessage: 'No issues',
  }),
};

interface Props {
  'data-test-subj'?: string;
}

export const NoDeprecationIssues: FunctionComponent<Props> = (props) => {
  return (
    <EuiText color="success">
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon type="checkInCircleFilled" />
        </EuiFlexItem>

        <EuiFlexItem grow={false} data-test-subj={props['data-test-subj']}>
          {i18nTexts.noDeprecationIssuesText}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiText>
  );
};
