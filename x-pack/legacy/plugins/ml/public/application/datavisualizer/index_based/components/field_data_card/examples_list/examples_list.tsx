/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { EuiSpacer, EuiText } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';

import { Example } from './example';

interface Props {
  examples: Array<string | object>;
}

export const ExamplesList: FC<Props> = ({ examples }) => {
  if (examples === undefined || examples === null || examples.length === 0) {
    return null;
  }

  const examplesContent = examples.map((example, i) => {
    return <Example key={`example_${i}`} example={example} />;
  });

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
      {examplesContent}
    </div>
  );
};
