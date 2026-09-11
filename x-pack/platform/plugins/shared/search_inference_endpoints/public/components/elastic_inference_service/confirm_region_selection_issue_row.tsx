/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText, EuiTextTruncate } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RegionPolicyConflictArtifact } from '../../types';

const issueNameColumnStyles = css`
  min-inline-size: 0;
`;

export interface ConfirmRegionSelectionIssueRowProps {
  artifact: RegionPolicyConflictArtifact;
  index: number;
}

export const ConfirmRegionSelectionIssueRow: React.FC<ConfirmRegionSelectionIssueRowProps> = ({
  artifact,
  index,
}) => {
  const endpointsLabel = artifact.endpointIds.join(', ');

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="flexStart"
      justifyContent="spaceBetween"
      responsive={false}
    >
      <EuiFlexItem css={issueNameColumnStyles}>
        <EuiText size="s">
          <p>{artifact.name}</p>
        </EuiText>
        <EuiText
          size="xs"
          color="subdued"
          data-test-subj={`confirmRegionSelectionIssueEndpoints-${index}`}
        >
          <EuiTextTruncate text={endpointsLabel} />
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow" data-test-subj={`confirmRegionSelectionIssueType-${index}`}>
          {artifact.type === 'index'
            ? i18n.translate(
                'xpack.searchInferenceEndpoints.confirmRegionSelection.indexBadgeLabel',
                { defaultMessage: 'Index' }
              )
            : i18n.translate(
                'xpack.searchInferenceEndpoints.confirmRegionSelection.pipelineBadgeLabel',
                { defaultMessage: 'Pipeline' }
              )}
        </EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
