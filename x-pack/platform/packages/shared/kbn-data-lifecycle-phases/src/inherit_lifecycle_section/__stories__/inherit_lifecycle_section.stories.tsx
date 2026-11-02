/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EuiPanel } from '@elastic/eui';
import { InheritLifecycleSection } from '../inherit_lifecycle_section';

const StatefulExample = (
  props: Omit<React.ComponentProps<typeof InheritLifecycleSection>, 'value' | 'onChange'>
) => {
  const [value, setValue] = useState(false);
  return <InheritLifecycleSection {...props} value={value} onChange={setValue} />;
};

export const Default: StoryObj = {
  name: 'Default',
  render: () => (
    <EuiPanel paddingSize="l">
      <StatefulExample label="Inherit lifecycle from index template" />
    </EuiPanel>
  ),
};

export const WithDescriptionAndLink: StoryObj = {
  name: 'With link',
  render: () => (
    <EuiPanel paddingSize="l">
      <StatefulExample
        label="Inherit lifecycle from index template"
        link={{ href: '#', label: 'View index template' }}
      />
    </EuiPanel>
  ),
};

const meta: Meta<typeof InheritLifecycleSection> = {
  title: 'Data Lifecycle Phases / Inherit Lifecycle Section',
  component: InheritLifecycleSection,
};

export default meta;
