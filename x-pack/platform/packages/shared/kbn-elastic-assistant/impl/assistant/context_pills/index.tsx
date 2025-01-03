/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { sortBy } from 'lodash/fp';
import React, { useCallback, useMemo } from 'react';

import { FindAnonymizationFieldsResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/find_anonymization_fields_route.gen';
import { getNewSelectedPromptContext } from '../../data_anonymization/get_new_selected_prompt_context';
import type { PromptContext, SelectedPromptContext } from '../prompt_context/types';

interface Props {
  anonymizationFields: FindAnonymizationFieldsResponse;
  promptContexts: Record<string, PromptContext>;
  selectedPromptContexts: Record<string, SelectedPromptContext>;
  setSelectedPromptContexts: React.Dispatch<
    React.SetStateAction<Record<string, SelectedPromptContext>>
  >;
}

const ContextPillsComponent: React.FC<Props> = ({
  anonymizationFields,
  promptContexts,
  selectedPromptContexts,
  setSelectedPromptContexts,
}) => {
  const sortedPromptContexts = useMemo(
    () => sortBy('description', Object.values(promptContexts)),
    [promptContexts]
  );

  const selectPromptContext = useCallback(
    async (id: string) => {
      if (selectedPromptContexts[id] == null && promptContexts[id] != null && anonymizationFields) {
        const newSelectedPromptContext = await getNewSelectedPromptContext({
          anonymizationFields,
          promptContext: promptContexts[id],
        });

        setSelectedPromptContexts((prev) => ({
          ...prev,
          [id]: newSelectedPromptContext,
        }));
      }
    },
    [anonymizationFields, promptContexts, selectedPromptContexts, setSelectedPromptContexts]
  );

  return (
    <EuiFlexGroup gutterSize="none" wrap>
      {sortedPromptContexts.map(({ description, id, tooltip }) => {
        // Workaround for known issue where tooltip won't dismiss after button state is changed once clicked
        // See: https://github.com/elastic/eui/issues/6488#issuecomment-1379656704
        const button = (
          <EuiButtonEmpty
            data-test-subj={`pillButton-${id}`}
            disabled={selectedPromptContexts[id] != null}
            iconSide="left"
            iconType="plusInCircle"
            size="s"
            onClick={() => selectPromptContext(id)}
          >
            {description}
          </EuiButtonEmpty>
        );
        return (
          <EuiFlexItem grow={false} key={id}>
            {selectedPromptContexts[id] != null ? (
              button
            ) : (
              <EuiToolTip content={tooltip}>{button}</EuiToolTip>
            )}
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};

export const ContextPills = React.memo(ContextPillsComponent);
