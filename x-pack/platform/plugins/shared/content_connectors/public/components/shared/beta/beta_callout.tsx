/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { KbnWarningCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';

interface BetaCallOutProps {
  description: string;
  title?: string;
}

export const BetaCallOut: React.FC<BetaCallOutProps> = ({ title, description }) => {
  return (
    <KbnWarningCallout
      title={
        title ||
        i18n.translate('xpack.contentConnectors.betaCalloutTitle', {
          defaultMessage: 'Beta feature',
        })
      }
      text={description}
    />
  );
};
