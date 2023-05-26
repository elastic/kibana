/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
// eslint-disable-next-line @kbn/eslint/module_migration
import styled from 'styled-components';

import { sortBy } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';

import type { PromptContext } from '../prompt_context/types';

const PillButton = styled(EuiButton)`
  margin-right: ${({ theme }) => theme.eui.euiSizeXS};
`;

interface Props {
  promptContexts: Record<string, PromptContext>;
  selectedPromptContextIds: string[];
  setSelectedPromptContextIds: React.Dispatch<React.SetStateAction<string[]>>;
}

const ContextPillsComponent: React.FC<Props> = ({
  promptContexts,
  selectedPromptContextIds,
  setSelectedPromptContextIds,
}) => {
  const sortedPromptContexts = useMemo(
    () => sortBy('description', Object.values(promptContexts)),
    [promptContexts]
  );

  const selectPromptContext = useCallback(
    (id: string) => {
      if (!selectedPromptContextIds.includes(id)) {
        setSelectedPromptContextIds((prev) => [...prev, id]);
      }
    },
    [selectedPromptContextIds, setSelectedPromptContextIds]
  );

  return (
    <EuiFlexGroup gutterSize="none" wrap>
      {sortedPromptContexts.map(({ description, id, getPromptContext, tooltip }) => (
        <EuiFlexItem grow={false} key={id}>
          <EuiToolTip content={tooltip}>
            <PillButton
              data-test-subj={`pillButton-${id}`}
              disabled={selectedPromptContextIds.includes(id)}
              iconSide="left"
              iconType="plus"
              onClick={() => selectPromptContext(id)}
            >
              {description}
            </PillButton>
          </EuiToolTip>
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

export const ContextPills = React.memo(ContextPillsComponent);
