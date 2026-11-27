/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import type { EuiHorizontalRuleProps } from '@elastic/eui';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormFieldset,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { css } from '@emotion/react';

export const FLYOUT_PADDING_SIZE = 'l' as const;

/** A rule from edge to edge of a flyout with a padding, through the padding. */
export const FullWidthRule = ({ margin }: Pick<EuiHorizontalRuleProps, 'margin'>) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div
      css={css`
        margin-inline: -${euiTheme.size[FLYOUT_PADDING_SIZE]};
      `}
    >
      <EuiHorizontalRule margin={margin} />
    </div>
  );
};

export interface FormSectionProps {
  title: string;
  description?: ReactNode;
  /** Leaves out the rule above the section, for a section with nothing above it. */
  hasRule?: boolean;
  children: ReactNode;
  'data-test-subj'?: string;
}

/** A titled group of fields in the profile flyout. */
export const FormSection = ({
  title,
  description,
  hasRule = true,
  children,
  'data-test-subj': dataTestSubj,
}: FormSectionProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'searchBoostProfileFlyoutSection' });
  const descriptionId = useGeneratedHtmlId({ prefix: 'searchBoostProfileFlyoutSectionInfo' });

  return (
    <>
      {hasRule ? <FullWidthRule margin="m" /> : null}
      <EuiFormFieldset
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        data-test-subj={dataTestSubj}
      >
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiTitle size="xs">
              <h3 id={titleId}>{title}</h3>
            </EuiTitle>
          </EuiFlexItem>
          {description ? (
            <EuiFlexItem grow={false}>
              <EuiText id={descriptionId} size="xs" color="subdued">
                <p>{description}</p>
              </EuiText>
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={false}>{children}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormFieldset>
    </>
  );
};

/** The label of a checkable card: its title, with a description below. */
export const CardLabel = ({ title, description }: { title: string; description?: string }) => (
  <>
    <strong>{title}</strong>
    {description ? (
      <>
        <EuiSpacer size="xs" />
        <EuiText size="xs">{description}</EuiText>
      </>
    ) : null}
  </>
);
