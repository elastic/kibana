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
  noPartialDeprecationIssuesText: i18n.translate(
    'xpack.upgradeAssistant.noPartialDeprecationsMessage',
    {
      defaultMessage: 'None',
    }
  ),
  noDeprecationIssuesText: i18n.translate('xpack.upgradeAssistant.noDeprecationsMessage', {
    defaultMessage: 'No issues',
  }),
};

interface Props {
  isPartial?: boolean;
  'data-test-subj'?: string;
}

export const NoDeprecationIssues: FunctionComponent<Props> = (props) => {
  const { isPartial = false } = props;

  return (
    <EuiText color="success">
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon type="check" />
        </EuiFlexItem>

        <EuiFlexItem grow={false} data-test-subj={props['data-test-subj']}>
          {isPartial ? i18nTexts.noPartialDeprecationIssuesText : i18nTexts.noDeprecationIssuesText}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiText>
  );
};
