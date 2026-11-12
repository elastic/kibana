/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppHeader } from '@kbn/app-header';
import { SEARCH_BOOST_APP_TITLE, SEARCH_BOOST_PAGE_DESCRIPTION } from '../translations';

export const SearchBoostPage = () => (
  <AppHeader
    title={SEARCH_BOOST_APP_TITLE}
    description={SEARCH_BOOST_PAGE_DESCRIPTION}
    spacing="bleed"
  />
);
