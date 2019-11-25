/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import {
  EuiBetaBadge,
} from '@elastic/eui';

export function ExperimentalBadge({ tooltipContent }) {
  return (
    <span>
      <EuiBetaBadge
        className="ml-experimental-badge"
        label={
          <FormattedMessage
            id="xpack.ml.fileDatavisualizer.experimentalBadge.experimentalLabel"
            defaultMessage="Experimental"
          />
        }
        tooltipContent={tooltipContent}
      />
    </span>
  );
}
