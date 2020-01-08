/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EuiFlexItem, EuiCard } from '@elastic/eui';

interface CardProps {
  onClick: () => void;
  isSelected: boolean;
}

export const CountCard: FC<CardProps> = ({ onClick, isSelected }) => (
  <EuiFlexItem>
    <EuiCard
      title={i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.categorizationDetectorSelect.countCard.title',
        {
          defaultMessage: 'Count',
        }
      )}
      description={
        <>
          <FormattedMessage
            id="xpack.ml.newJob.wizard.pickFieldsStep.categorizationDetectorSelect.countCard.description1"
            defaultMessage="Look for anomalies in the number of categories."
          />
          {/* <br />
          <FormattedMessage
            id="xpack.ml.newJob.wizard.pickFieldsStep.categorizationDetectorSelect.countCard.description1"
            defaultMessage="Lorem ipsum dolor sit amet, consectetur adipiscing."
          /> */}
        </>
      }
      selectable={{ onClick, isSelected }}
    />
  </EuiFlexItem>
);

export const RareCard: FC<CardProps> = ({ onClick, isSelected }) => (
  <EuiFlexItem>
    <EuiCard
      title={i18n.translate(
        'xpack.ml.newJob.wizard.pickFieldsStep.categorizationDetectorSelect.rareCard.title',
        {
          defaultMessage: 'Rare',
        }
      )}
      description={
        <>
          <FormattedMessage
            id="xpack.ml.newJob.wizard.pickFieldsStep.categorizationDetectorSelect.countCard.description1"
            defaultMessage="Look for rare categories."
          />
          {/* <br />
          <FormattedMessage
            id="xpack.ml.newJob.wizard.pickFieldsStep.categorizationDetectorSelect.countCard.description1"
            defaultMessage="Lorem ipsum dolor sit amet, consectetur adipiscing."
          /> */}
        </>
      }
      selectable={{ onClick, isSelected }}
    />
  </EuiFlexItem>
);
