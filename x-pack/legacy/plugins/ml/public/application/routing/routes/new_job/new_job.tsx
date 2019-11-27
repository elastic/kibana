/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { Redirect } from 'react-router-dom';

import { MlRoute } from '../../router';

export const newJobRoute: MlRoute = {
  path: '/jobs/new_job',
  render: (props: any, config: any) => <Page />,
};

const Page: FC = () => {
  return <Redirect to="/jobs/new_job/step/index_or_search" />;
};
