/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { Fragment } from 'react';
import { EuiSpacer, EuiCodeBlock, EuiText } from '@elastic/eui';
import { Monospace } from '../components/monospace';
import { FormattedMessage } from '@kbn/i18n-react';
import { UNDETECTED_BEAT_TYPE } from './common_beats_instructions';
import { getDisableStatusStep } from '../common_instructions';

export function getBeatsInstructionsForDisablingInternalCollection(product, meta) {
  const beatType = product.beatType;
  const disableInternalCollectionStep = {
    title: i18n.translate(
      'xpack.monitoring.metricbeatMigration.beatsInstructions.disableInternalCollection.title',
      {
        defaultMessage: "Disable self monitoring of {beatType}'s monitoring metrics",
        values: {
          beatType: beatType || UNDETECTED_BEAT_TYPE,
        },
      }
    ),
    children: (
      <Fragment>
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.beatsInstructions.disableInternalCollection.description"
              defaultMessage="Add the following setting in {beatType}'s configuration file ({file}):"
              values={{
                beatType: beatType || UNDETECTED_BEAT_TYPE,
                file: <Monospace>{beatType}.yml</Monospace>,
              }}
            />
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiCodeBlock isCopyable language="bash">
          monitoring.enabled: false
        </EuiCodeBlock>
        <EuiSpacer size="s" />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.monitoring.metricbeatMigration.beatsInstructions.disableInternalCollection.note"
              defaultMessage="You'll need to restart {beatType} after making this change."
              values={{
                beatType: beatType || UNDETECTED_BEAT_TYPE,
              }}
            />
          </p>
        </EuiText>
      </Fragment>
    ),
  };

  const migrationStatusStep = getDisableStatusStep(product, meta);

  return [disableInternalCollectionStep, migrationStatusStep];
}
