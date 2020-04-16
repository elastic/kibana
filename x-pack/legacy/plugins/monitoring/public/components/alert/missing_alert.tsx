/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

export interface MissingAlertProps {
  type: string;
}

export const MissingAlert: React.FC<MissingAlertProps> = (props: MissingAlertProps) => {
  const { type } = props;

  return <h2>Missing {type}!</h2>;
};
