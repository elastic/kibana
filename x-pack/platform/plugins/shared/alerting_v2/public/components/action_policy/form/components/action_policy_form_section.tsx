/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescribedFormGroup, EuiIcon, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FlyoutAccordion } from '@kbn/flyout-sections';
import type { ReactNode } from 'react';
import React from 'react';
import { useFormState } from 'react-hook-form';
import type {
  ActionPolicyFormState,
  CollapsibleSection,
  CollapsibleSectionConfig,
  FormLayout,
} from '../types';

type ActionPolicyFormSectionId = 'policyDetails' | 'policyScope' | CollapsibleSection;
type ActionPolicyFormFieldNames = ReadonlyArray<keyof ActionPolicyFormState>;

interface ActionPolicyFormSectionProps {
  children: ReactNode;
  config?: CollapsibleSectionConfig;
  description: ReactNode;
  /**
   * Fields of a collapsible section. Their errors are flagged in the title, as a
   * collapsed accordion would otherwise hide them.
   */
  fieldNames?: ActionPolicyFormFieldNames;
  id: ActionPolicyFormSectionId;
  layout?: FormLayout;
  title: ReactNode;
}

// Subscribes to the section's errors in a leaf so they don't re-render the whole form.
const SectionErrorIcon = ({
  fieldNames,
  id,
}: {
  fieldNames: ActionPolicyFormFieldNames;
  id: ActionPolicyFormSectionId;
}) => {
  const { errors } = useFormState<ActionPolicyFormState>({ name: fieldNames });
  if (!fieldNames.some((name) => errors[name])) {
    return null;
  }

  return (
    <>
      {' '}
      <EuiIcon
        type="error"
        color="danger"
        aria-label={i18n.translate('xpack.alertingV2.actionPolicy.form.section.hasErrors', {
          defaultMessage: 'This section has errors',
        })}
        data-test-subj={`actionPolicyFormSectionError-${id}`}
      />
    </>
  );
};

export const ActionPolicyFormSection = ({
  children,
  config,
  description,
  fieldNames,
  id,
  layout = 'page',
  title,
}: ActionPolicyFormSectionProps) => {
  if (config) {
    return (
      <FlyoutAccordion
        title={
          <>
            {title}
            {fieldNames && <SectionErrorIcon fieldNames={fieldNames} id={id} />}
          </>
        }
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
