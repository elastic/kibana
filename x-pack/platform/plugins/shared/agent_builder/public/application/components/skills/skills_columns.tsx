/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { PublicSkillSummary } from '@kbn/agent-builder-common';
import React from 'react';
import { labels } from '../../utils/i18n';

export const createSkillIdColumn = (options?: {
  onClick?: (skillId: string) => void;
}): EuiBasicTableColumn<PublicSkillSummary> => ({
  field: 'id',
  name: labels.skills.skillIdLabel,
  sortable: true,
  width: '30%',
  render: (id: string, skill: PublicSkillSummary) => (
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem>
        {options?.onClick ? (
          <EuiLink
            onClick={() => options.onClick!(skill.id)}
            data-test-subj={`agentBuilderSkillLink-${skill.id}`}
          >
            <EuiText size="s">
              <strong>{skill.id}</strong>
            </EuiText>
          </EuiLink>
        ) : (
          <EuiText size="s">
            <strong>{id}</strong>
          </EuiText>
        )}
      </EuiFlexItem>
      {skill.name !== skill.id && (
        <EuiFlexItem>
          <EuiText size="xs" color="subdued">
            {skill.name}
          </EuiText>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  ),
});

export const createSkillDescriptionColumn = (): EuiBasicTableColumn<PublicSkillSummary> => ({
  field: 'description',
  name: labels.skills.descriptionLabel,
  truncateText: true,
  width: '40%',
});

export const createSkillTypeColumn = (): EuiBasicTableColumn<PublicSkillSummary> => ({
  field: 'readonly',
  name: labels.skills.typeLabel,
  width: '100px',
  render: (readonly: boolean) => (
    <EuiBadge color={readonly ? 'hollow' : 'primary'}>
      {readonly ? labels.skills.builtinLabel : labels.skills.customLabel}
    </EuiBadge>
  ),
});
