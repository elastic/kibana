/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { isAddressValid, isPortValid } from './validate_address';

export function validateSeed(seed?: string): JSX.Element[] {
  const errors: JSX.Element[] = [];

  if (!seed) {
    return errors;
  }

  const isValid = isAddressValid(seed);

  if (!isValid) {
    errors.push(
      <FormattedMessage
        id="xpack.remoteClusters.remoteClusterForm.localSeedError.invalidCharactersMessage"
        defaultMessage="Seed node must use host:port format. Example: 127.0.0.1:9400, localhost:9400. Hosts can only consist of letters, numbers, and dashes."
      />
    );
  }

  if (!isPortValid(seed)) {
    errors.push(
      <FormattedMessage
        id="xpack.remoteClusters.remoteClusterForm.localSeedError.invalidPortMessage"
        defaultMessage="A port is required."
      />
    );
  }

  return errors;
}
