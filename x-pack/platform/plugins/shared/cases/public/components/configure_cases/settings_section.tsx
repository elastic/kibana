/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';

export interface SettingsSectionProps {
  title: string;
  description: ReactNode;
  children: ReactNode;
  'data-test-subj'?: string;
}

const SettingsSectionComponent: React.FC<SettingsSectionProps> = ({
  title,
  description,
  children,
  'data-test-subj': dataTestSubj,
}) => (
  <section data-test-subj={dataTestSubj}>
    <EuiTitle size="s">
      <h2>{title}</h2>
    </EuiTitle>
    <EuiSpacer size="m" />
    <EuiText size="m">{description}</EuiText>
    <EuiSpacer size="m" />
    {children}
  </section>
);

SettingsSectionComponent.displayName = 'SettingsSection';

export const SettingsSection = React.memo(SettingsSectionComponent);
