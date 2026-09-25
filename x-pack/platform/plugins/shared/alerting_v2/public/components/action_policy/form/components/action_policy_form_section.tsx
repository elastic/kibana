/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescribedFormGroup, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { FlyoutAccordion } from '@kbn/flyout-sections';
import type { ReactNode } from 'react';
import React from 'react';
import type { CollapsibleSection, CollapsibleSectionConfig, FormLayout } from '../types';

type ActionPolicyFormSectionId = 'policyDetails' | 'policyScope' | CollapsibleSection;

interface ActionPolicyFormSectionProps {
  children: ReactNode;
  config?: CollapsibleSectionConfig;
  description: ReactNode;
  id: ActionPolicyFormSectionId;
  layout?: FormLayout;
  title: ReactNode;
}

export const ActionPolicyFormSection = ({
  children,
  config,
  description,
  id,
  layout = 'page',
  title,
}: ActionPolicyFormSectionProps) => {
  if (config) {
    return (
      <FlyoutAccordion
        title={title}
        initialIsOpen={config.initialIsOpen}
        hasBorder={false}
        data-test-subj={`actionPolicyFormSection-${id}`}
      >
        {description}
        <EuiSpacer size="m" />
        {children}
      </FlyoutAccordion>
    );
  }

  if (layout === 'flyout') {
    return (
      <div data-test-subj={`actionPolicyFormSection-${id}`}>
        <EuiTitle size="xs">
          <h3>{title}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s" color="subdued">
          {description}
        </EuiText>
        <EuiSpacer size="m" />
        {children}
      </div>
    );
  }

  return (
    <EuiDescribedFormGroup fullWidth title={<h3>{title}</h3>} description={description}>
      {children}
    </EuiDescribedFormGroup>
  );
};
