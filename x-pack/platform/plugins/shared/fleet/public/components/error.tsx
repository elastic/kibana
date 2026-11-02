/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { KbnDangerCallout } from '@kbn/ui-callout';

export const Error: React.FunctionComponent<{
  title: JSX.Element;
  error: Error | string;
}> = ({ title, error }) => {
  return (
    <KbnDangerCallout title={title} text={typeof error === 'string' ? error : error.message} />
  );
};
