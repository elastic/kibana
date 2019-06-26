/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { SFC } from 'react';

import {
  EuiDescriptionList,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiTitle,
  EuiSpacer,
} from '@elastic/eui';

export interface SectionItem {
  title: string;
  description: string;
}
export interface SectionConfig {
  title: string;
  position: 'left' | 'right';
  items: SectionItem[];
}

interface SectionProps {
  section: SectionConfig;
}

export const Section: SFC<SectionProps> = ({ section }) => {
  if (section.items.length === 0) {
    return null;
  }

  return (
    <EuiPanel>
      <EuiTitle size="xs">
        <span>{section.title}</span>
      </EuiTitle>
      <EuiDescriptionList compressed type="column" listItems={section.items} />
    </EuiPanel>
  );
};

interface JobDetailsPaneProps {
  sections: SectionConfig[];
}

export const JobDetailsPane: SFC<JobDetailsPaneProps> = ({ sections }) => {
  return (
    <EuiFlexGroup>
      <EuiFlexItem>
        <EuiSpacer size="s" />
        {sections
          .filter(s => s.position === 'left')
          .map(s => (
            <Section section={s} key={s.title} />
          ))}
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiSpacer size="s" />
        {sections
          .filter(s => s.position === 'right')
          .map(s => (
            <Section section={s} key={s.title} />
          ))}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
