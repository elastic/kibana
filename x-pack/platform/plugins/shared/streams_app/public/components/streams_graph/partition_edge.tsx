/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIcon, EuiFlexGroup, EuiPopover, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/css';
import { useBoolean } from '@kbn/react-hooks';
import type { ReactNode } from 'react';
import React from 'react';
import useAsync from 'react-use/lib/useAsync';
import { i18n } from '@kbn/i18n';
import type { StreamDocCountsFetch } from '../../hooks/use_streams_doc_counts_fetch';

interface PartitionEdgeProps {
  content?: ReactNode;
  parentDocuments?: StreamDocCountsFetch;
  currentDocuments: StreamDocCountsFetch;
}

export const PartitionEdge = ({
  content,
  parentDocuments,
  currentDocuments,
}: PartitionEdgeProps) => {
  const { euiTheme } = useEuiTheme();
  let matches = 0;
  if (parentDocuments) {
    const parentCountResult = useAsync(() => parentDocuments.docCount, [parentDocuments]);
    const currentCountResult = useAsync(() => currentDocuments.docCount, [currentDocuments]);
    const parentDocs = parentCountResult?.value
      ? Number(parentCountResult.value?.values?.[0]?.[0])
      : 0;
    const currentDocs = currentCountResult?.value
      ? Number(currentCountResult.value?.values?.[0]?.[0])
      : 0;

    matches = (currentDocs / parentDocs) * 100;
  }

  const [isPopoverOpen, { off: closePopover, toggle: togglePopover }] = useBoolean(false);

  const buttonClass = css`
    background: ${euiTheme.colors.emptyShade};
    border-radius: 50%;
    border: 1px solid ${euiTheme.colors.lightShade};
  `;

  const button = (
    <EuiButtonIcon
      iconType="code"
      className={buttonClass}
      onClick={togglePopover}
      aria-label="Show routing condition"
    />
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      color="text"
      focusTrapProps={{
        onEscapeKey: closePopover,
      }}
    >
      <EuiFlexGroup justifyContent="spaceBetween" direction="column" gutterSize="s">
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiText size="s">
            <h4>
              {i18n.translate('xpack.streams.streamsGraph.partitionEdge.routingConditionLabel', {
                defaultMessage: 'Routing Condition',
              })}
            </h4>
          </EuiText>
          {!Number.isNaN(matches) && (
            <EuiText size="s">
              {i18n.translate('xpack.streams.streamsGraph.partitionEdge.matchPercentageLabel', {
                defaultMessage: '{matches}% Match',
                values: { matches: matches.toFixed(2) },
              })}
            </EuiText>
          )}
        </EuiFlexGroup>
        {content}
      </EuiFlexGroup>
    </EuiPopover>
  );
};
