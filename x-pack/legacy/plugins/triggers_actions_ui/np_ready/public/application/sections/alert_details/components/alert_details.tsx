/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RouteComponentProps } from 'react-router-dom';

interface AlertDetailsProps {
  alertId: string;
}
export const AlertDetails: React.FunctionComponent<AlertDetailsProps> = ({ alertId }) => {
  return <div>{alertId}</div>;
};

export const AlertDetailsRoute: React.FunctionComponent<RouteComponentProps<AlertDetailsProps>> = ({
  match: { params },
}) => {
  return <AlertDetails {...params} />;
};
