/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

import { FilterMode } from '../../../components/recent_timelines/types';
import { Sidebar } from './sidebar';

export const StatefulSidebar = React.memo(() => {
  const [filterBy, setFilterBy] = useState<FilterMode>('favorites');

  return <Sidebar filterBy={filterBy} setFilterBy={setFilterBy} />;
});

StatefulSidebar.displayName = 'StatefulSidebar';
