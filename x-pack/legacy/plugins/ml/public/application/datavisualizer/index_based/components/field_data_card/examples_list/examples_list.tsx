/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { EuiListGroup, EuiListGroupItem, EuiSpacer, EuiText } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

interface Props {
  examples: Array<string | object>;
}

export const ExamplesList: FC<Props> = ({ examples }) => {
  if (examples === undefined || examples === null || examples.length === 0) {
    return null;
  }

  const examplesContent = examples.map((example, i) => {
    return (
      <EuiListGroupItem
        style={{ padding: 0, justifyContent: 'center' }}
        size="xs"
        key={`example_${i}`}
        label={typeof example === 'string' ? example : JSON.stringify(example)}
      />
    );
  });

  return (
    <div>
      <EuiText size="s">
        <h6>
          <FormattedMessage
            id="xpack.ml.fieldDataCard.cardText.examplesTitle"
            defaultMessage="{numExamples, plural, one {value} other {examples}}"
            values={{
              numExamples: examples.length,
            }}
          />
        </h6>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiListGroup flush={true} showToolTips={true}>
        {examplesContent}
      </EuiListGroup>
    </div>
  );
};
