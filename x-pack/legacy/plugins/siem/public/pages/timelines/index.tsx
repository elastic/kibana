/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { ApolloConsumer } from 'react-apollo';

import { TimelinesPage } from './timelines_page';

export const Timelines = React.memo(() => (
  <ApolloConsumer>{client => <TimelinesPage apolloClient={client} />}</ApolloConsumer>
));

Timelines.displayName = 'Timelines';
