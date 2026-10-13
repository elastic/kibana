/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import {
  EuiFormFieldset,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FullWidthDivider } from './full_width_divider';

interface FormSectionProps {
  title: string;
  description?: ReactNode;
  /** Omit the divider for a section with nothing above it. */
  hasDivider?: boolean;
  children: ReactNode;
  'data-test-subj'?: string;
}

/**
 * A titled group of fields in the profile flyout, separated from the content above by a divider
 * that spans the flyout's full width.
 */
export const FormSection = ({
  title,
  description,
  hasDivider = true,
  children,
  'data-test-subj': dataTestSubj,
}: FormSectionProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'formSectionTitle' });
  const descriptionId = useGeneratedHtmlId({ prefix: 'formSectionDescription' });

  return (
    <>
      {hasDivider && <FullWidthDivider margin="m" />}
      <EuiFormFieldset
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        data-test-subj={dataTestSubj}
      >
        <EuiTitle size="xs">
          <h3 id={titleId}>{title}</h3>
        </EuiTitle>
        {description && (
          <>
            <EuiSpacer size="xs" />
            <EuiText id={descriptionId} size="xs" color="subdued">
              <p>{description}</p>
            </EuiText>
          </>
        )}
        <EuiSpacer size="m" />
        {children}
      </EuiFormFieldset>
    </>
  );
};

interface FormSubsectionProps {
  title: string;
  description?: string;
  children: ReactNode;
  'data-test-subj'?: string;
}

/** A smaller titled group of fields within a form section, in a bordered panel. */
export const FormSubsection = ({
  title,
  description,
  children,
  'data-test-subj': dataTestSubj,
}: FormSubsectionProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'formSubsectionTitle' });
  const descriptionId = useGeneratedHtmlId({ prefix: 'formSubsectionDescription' });

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <EuiFormFieldset
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        data-test-subj={dataTestSubj}
      >
        <EuiTitle size="xxs">
          <h4 id={titleId}>{title}</h4>
        </EuiTitle>
        {description && (
          <EuiText id={descriptionId} size="xs" color="subdued">
            <p>{description}</p>
          </EuiText>
        )}
        <EuiSpacer size="s" />
        {children}
      </EuiFormFieldset>
    </EuiPanel>
  );
};
