/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSkeletonText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import type { DreamingTemplateSummary } from '../../../../common/dreaming_templates';
import { CUSTOM_TEMPLATE_ID } from './use_dreaming_setup_draft';
import { customLabel } from './translations';

interface PillProps {
  label: string;
  isSelected: boolean;
  iconType?: string;
  onClick: () => void;
  'data-test-subj': string;
}

const Pill = ({
  label,
  isSelected,
  iconType,
  onClick,
  'data-test-subj': dataTestSubj,
}: PillProps) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiButton
      size="s"
      css={css`
        border-radius: ${euiTheme.size.xl};
      `}
      color={isSelected ? 'primary' : 'text'}
      iconType={isSelected ? 'check' : iconType}
      isSelected={isSelected}
      onClick={onClick}
      data-test-subj={dataTestSubj}
    >
      {label}
    </EuiButton>
  );
};

export interface DreamingTemplatePickerProps {
  templates: DreamingTemplateSummary[];
  selectedId: string | undefined;
  isLoading: boolean;
  onSelect: (id: string) => void;
}

export const DreamingTemplatePicker = ({
  templates,
  selectedId,
  isLoading,
  onSelect,
}: DreamingTemplatePickerProps) => {
  const isCustom = selectedId === CUSTOM_TEMPLATE_ID;

  if (isLoading) {
    return <EuiSkeletonText lines={2} data-test-subj="contextDreamingTemplatesLoading" />;
  }

  return (
    <EuiFlexGroup gutterSize="s" wrap responsive={false} role="group">
      {templates.map(({ id, name }) => (
        <EuiFlexItem grow={false} key={id}>
          <Pill
            label={name}
            isSelected={id === selectedId}
            onClick={() => onSelect(id)}
            data-test-subj={`contextDreamingTemplateOption-${id}`}
          />
        </EuiFlexItem>
      ))}
      <EuiFlexItem grow={false}>
        <Pill
          label={customLabel}
          iconType="plus"
          isSelected={isCustom}
          onClick={() => onSelect(CUSTOM_TEMPLATE_ID)}
          data-test-subj={`contextDreamingTemplateOption-${CUSTOM_TEMPLATE_ID}`}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
