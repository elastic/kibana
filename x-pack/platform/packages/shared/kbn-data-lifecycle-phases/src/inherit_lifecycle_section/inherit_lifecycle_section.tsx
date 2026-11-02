/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { inheritLifecycleSectionStrings as strings } from './strings';
import type { InheritLifecycleSectionProps } from './types';

export const InheritLifecycleSection = ({
  value,
  onChange,
  label,
  link,
  checkboxId,
  checkboxIdPrefix = 'inheritLifecycle',
  linkDataTestSubj,
}: InheritLifecycleSectionProps) => {
  const generatedCheckboxId = useGeneratedHtmlId({ prefix: checkboxIdPrefix });
  const id = checkboxId ?? generatedCheckboxId;
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiCheckbox
          id={id}
          checked={value}
          label={label}
          onChange={(e) => onChange(e.target.checked)}
          data-test-subj="dataLifecycleInheritCheckbox"
        />
      </EuiFlexItem>

      {link && (
        <EuiFlexItem
          grow={false}
          css={{
            paddingLeft: euiTheme.size.l,
          }}
        >
          <EuiText size="xs">
            <EuiLink
              data-test-subj={linkDataTestSubj}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              external={false}
            >
              {link.label ?? strings.viewSourceLink}
            </EuiLink>
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
