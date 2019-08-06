/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText, EuiToolTip } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

interface Props {
  examples: any[];
}

function getExamples(examples: any[]) {
  // Use 95% width for each example so that the truncation ellipses show up when
  // wrapped inside a tooltip.
  return examples.map((example, i) => {
    const exampleStr = typeof example === 'string' ? example : JSON.stringify(example);

    return (
      <EuiFlexGroup key={`example_${i}`} gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false} style={{ width: '95%' }} className="eui-textTruncate">
          <EuiToolTip content={exampleStr}>
            <EuiText size="s" className="eui-textTruncate">
              {exampleStr}
            </EuiText>
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  });
}

export const ExamplesList: FC<Props> = ({ examples }) => {
  if (examples === undefined || examples === null || examples.length === 0) {
    return null;
  }

  return (
    <div>
      <EuiText>
        <FormattedMessage
          id="xpack.ml.fieldDataCard.cardText.examplesTitle"
          defaultMessage="{numExamples, plural, one {value} other {examples}}"
          values={{
            numExamples: examples.length,
          }}
        />
      </EuiText>
      <EuiSpacer size="s" />
      {getExamples(examples)}
    </div>
  );
};
