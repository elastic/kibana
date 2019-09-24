/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState, useEffect } from 'react';
import { EuiHorizontalRule } from '@elastic/eui';
import { IntegrationList } from '../../../common/types';
import { getIntegrations } from '../../data';
import { AvailableIntegrations } from './available_integrations';
import { InstalledIntegrations } from './installed_integrations';

export function IntegrationLists() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [filtered, setFiltered] = useState<IntegrationList>([]);

  useEffect(() => {
    getIntegrations({ category: selectedCategory }).then(setFiltered);
  }, [selectedCategory]);

  if (!filtered) return null;
  const installed = filtered.filter(({ status }) => status === 'installed');

  return (
    <Fragment>
      <InstalledIntegrations list={installed} />
      {installed.length ? <EuiHorizontalRule margin="l" /> : null}
      <AvailableIntegrations
        list={filtered}
        onCategoryChange={({ id }) => setSelectedCategory(id)}
      />
    </Fragment>
  );
}
