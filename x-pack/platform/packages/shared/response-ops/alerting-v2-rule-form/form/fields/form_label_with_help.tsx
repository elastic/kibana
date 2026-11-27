/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiPopover,
  EuiPopoverTitle,
  EuiText,
} from '@elastic/eui';

/** Label + question-mark tip for short field definitions (hover tooltip). */
export const FormLabelWithQuestionTip = ({
  label,
  tip,
  'data-test-subj': dataTestSubj,
}: {
  label: React.ReactNode;
  tip: React.ReactNode;
  'data-test-subj'?: string;
}) => (
  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} component="span">
    <EuiFlexItem grow={false}>{label}</EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiIconTip
        type="question"
        color="primary"
        position="right"
        content={tip}
        iconProps={dataTestSubj ? { 'data-test-subj': dataTestSubj } : undefined}
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);

/** Label + info icon popover for longer “when to use” concept help. */
export const FormLabelWithInfoPopover = ({
  label,
  title,
  body,
  'data-test-subj': dataTestSubj,
}: {
  label: React.ReactNode;
  title: string;
  body: React.ReactNode;
  'data-test-subj'?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} component="span">
      <EuiFlexItem grow={false}>{label}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiPopover
          isOpen={isOpen}
          closePopover={() => setIsOpen(false)}
          anchorPosition="upCenter"
          panelPaddingSize="s"
          button={
            <EuiButtonIcon
              iconType="info"
              color="primary"
              size="xs"
              aria-label={title}
              onClick={() => setIsOpen((open) => !open)}
              data-test-subj={dataTestSubj}
            />
          }
        >
          <EuiPopoverTitle paddingSize="s">{title}</EuiPopoverTitle>
          <EuiText size="s" style={{ maxWidth: 280 }}>
            <p>{body}</p>
          </EuiText>
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
