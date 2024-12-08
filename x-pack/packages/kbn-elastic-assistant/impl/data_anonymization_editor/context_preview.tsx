/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, PropsWithChildren } from 'react';
import { EuiText, useEuiTheme } from '@elastic/eui';
import { getAnonymizedValue } from '@kbn/elastic-assistant-common';
import { getAnonymizedData } from '@kbn/elastic-assistant-common/impl/data_anonymization/get_anonymized_data';
import { getAnonymizedValues } from '@kbn/elastic-assistant-common/impl/data_anonymization/get_anonymized_values';
import { css } from '@emotion/react';
import { AnonymizedData } from '@kbn/elastic-assistant-common/impl/data_anonymization/types';
import { SelectedPromptContext } from '../assistant/prompt_context/types';

const Strong = ({
  children,
  showRealValues,
  onClick,
}: PropsWithChildren<{ showRealValues: boolean; onClick: () => void }>) => {
  const { euiTheme } = useEuiTheme();

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events
    <strong
      css={css`
        color: ${showRealValues ? euiTheme.colors.success : euiTheme.colors.accent};
        cursor: pointer;
      `}
      onClick={onClick}
    >
      {children}
    </strong>
  );
};

export interface Props {
  selectedPromptContext: SelectedPromptContext;
  showRealValues: boolean;
  currentReplacements: AnonymizedData['replacements'] | undefined;
  onToggleShowAnonymizedValues: () => void;
}
const SelectedPromptContextPreviewComponent = ({
  selectedPromptContext,
  currentReplacements,
  showRealValues,
  onToggleShowAnonymizedValues,
}: Props) => {
  const data = useMemo(
    () =>
      getAnonymizedData({
        anonymizationFields: selectedPromptContext.contextAnonymizationFields?.data ?? [],
        getAnonymizedValue,
        getAnonymizedValues,
        rawData: selectedPromptContext.rawData as Record<string, string[]>,
        currentReplacements,
      }),
    [currentReplacements, selectedPromptContext]
  );

  return (
    <EuiText
      data-test-subj="selectedPromptContextPreview"
      color="subdued"
      size="xs"
      css={css`
        max-height: 240px;
        overflow: auto;
      `}
    >
      <code>
        <>
          {Object.entries(data.anonymizedData).map(([key, value]) => (
            <div key={key}>
              {`${key},`}

              {data.replacements[value[0]] ? (
                <Strong showRealValues={showRealValues} onClick={onToggleShowAnonymizedValues}>
                  {showRealValues ? data.replacements[value[0]] : value}
                </Strong>
              ) : (
                value
              )}
            </div>
          ))}
        </>
      </code>
    </EuiText>
  );
};

SelectedPromptContextPreviewComponent.displayName = 'SelectedPromptContextPreview';

export const SelectedPromptContextPreview = React.memo(SelectedPromptContextPreviewComponent);
