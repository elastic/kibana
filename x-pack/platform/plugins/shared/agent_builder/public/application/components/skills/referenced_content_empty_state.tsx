/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiIcon, EuiSpacer, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { labels } from '../../utils/i18n';

const addFileEbtProps = getEbtProps({
  element: AGENT_BUILDER_UI_EBT.element.pageContent,
  action: AGENT_BUILDER_UI_EBT.action.globalManagement.ADD_REFERENCED_FILE,
  detail: AGENT_BUILDER_UI_EBT.entity.SKILL,
});

export const ReferencedContentEmptyState: React.FC<{ onAdd: () => void }> = ({ onAdd }) => {
  const { euiTheme } = useEuiTheme();

  const containerStyle = css`
    border: 2px dashed ${euiTheme.colors.borderBaseSubdued};
    border-radius: ${euiTheme.border.radius.medium};
    padding: ${euiTheme.size.l};
  `;

  return (
    <div css={containerStyle} data-test-subj="agentBuilderSkillReferencedContentEmptyState">
      <EuiTitle size="xxs">
        <h3>{labels.skills.referencedFileSection.emptyStateTitle}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" color="subdued">
        {labels.skills.referencedFileSection.emptyStateDescription}
      </EuiText>
      <EuiSpacer size="m" />
      <EuiButton
        iconType="plusInCircle"
        onClick={onAdd}
        data-test-subj="agentBuilderSkillReferencedContentAddFile"
        {...addFileEbtProps}
      >
        {labels.skills.referencedFileSection.addFileButton}
      </EuiButton>
      <EuiSpacer size="m" />
      <EuiText size="xs" color="subdued">
        <EuiIcon type="info" color="subdued" size="s" aria-hidden={true} />{' '}
        {labels.skills.referencedFileSection.uploadingNotAvailable}
      </EuiText>
    </div>
  );
};
