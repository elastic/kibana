/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { MAX_NODE_CONNECTIONS } from '../../../../../../common/constants';

export function validateNodeConnections(connections?: number | null): null | JSX.Element {
  if (connections && connections > MAX_NODE_CONNECTIONS) {
    return (
      <FormattedMessage
        id="xpack.remoteClusters.form.errors.maxValue"
        defaultMessage="This number must be equal or less than {maxValue}."
        values={{
          maxValue: MAX_NODE_CONNECTIONS,
        }}
      />
    );
  }

  return null;
}
