/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Alert } from '../../../../types';

interface AlertDetailsProps {
  alert: Alert;
}

export const AlertDetails: React.FunctionComponent<AlertDetailsProps> = ({ alert }) => {
  return <div>{alert.id}</div>;
};
