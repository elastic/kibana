/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiCallOut,
  EuiCheckbox,
  EuiDescriptionList,
  EuiLink,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';

import { type ChangelogChange } from '../utils';

const calloutText =
  'A breaking change is included in a new version of this integration. Please review the linked pull request in the changelog below and confirm that you understand the breaking change before continuing.';

interface BreakingChangesCalloutProps {
  changes: ChangelogChange[];
  onChange: () => void;
  isUnderstood: boolean;
}

export const BreakingChangesCallout = ({
  changes,
  isUnderstood,
  onChange,
}: BreakingChangesCalloutProps) => {
  const checkboxId = useGeneratedHtmlId({ prefix: 'understoodBreakingChangeCheckbox' });
  const changeList = changes.map(({ link, description }) => {
    return {
      title: (
        <EuiLink href={link} external>
          {link}
        </EuiLink>
      ),
      description,
    };
  });

  return (
    <EuiCallOut color="warning" iconType="warning" title="Review breaking changes">
      <EuiText size="s">
        <p>{calloutText}</p>
        <EuiDescriptionList listItems={changeList} />
      </EuiText>
      <EuiSpacer size="l" />
      <EuiCheckbox
        id={checkboxId}
        label="I understand"
        onChange={onChange}
        checked={isUnderstood}
      />
    </EuiCallOut>
  );
};
