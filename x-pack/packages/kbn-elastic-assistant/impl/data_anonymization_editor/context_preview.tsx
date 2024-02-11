/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiText } from '@elastic/eui';
import { getAnonymizedValue } from '@kbn/elastic-assistant-common';
import { getAnonymizedData } from '@kbn/elastic-assistant-common/impl/data_anonymization/get_anonymized_data';
import { getAnonymizedValues } from '@kbn/elastic-assistant-common/impl/data_anonymization/get_anonymized_values';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';
import { AnonymizedData } from '@kbn/elastic-assistant-common/impl/data_anonymization/types';
import { SelectedPromptContext } from '../assistant/prompt_context/types';

export interface Props {
  selectedPromptContext: SelectedPromptContext;
  showRealValues: boolean;
  currentReplacements: AnonymizedData['replacements'] | undefined;
}
const SelectedPromptContextPreviewComponent = ({
  selectedPromptContext,
  currentReplacements,
  showRealValues,
}: Props) => {
  const data = useMemo(
    () =>
      getAnonymizedData({
        allow: selectedPromptContext.allow,
        allowReplacement: selectedPromptContext.allowReplacement,
        getAnonymizedValue,
        getAnonymizedValues,
        rawData: selectedPromptContext.rawData as Record<string, string[]>,
        currentReplacements,
      }),
    [
      currentReplacements,
      selectedPromptContext.allow,
      selectedPromptContext.allowReplacement,
      selectedPromptContext.rawData,
    ]
  );

  return (
    <>
      {Object.entries(data.anonymizedData).map(([key, value]) => (
        <EuiText
          color="subdued"
          css={css`
            font-family: 'Roboto Mono';
            font-size: ${euiThemeVars.euiFontSizeXS};
          `}
        >
          {`${key},`}

          {data.replacements[value[0]] ? (
            <strong
              css={css`
                color: ${showRealValues
                  ? euiThemeVars.euiColorSuccess
                  : euiThemeVars.euiColorAccent};
              `}
            >
              {showRealValues ? data.replacements[value[0]] : value}
            </strong>
          ) : (
            value
          )}
        </EuiText>
      ))}
    </>
  );
};

SelectedPromptContextPreviewComponent.displayName = 'SelectedPromptContextPreview';

export const SelectedPromptContextPreview = React.memo(SelectedPromptContextPreviewComponent);
