/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, useEuiTheme, EuiEmptyPrompt, EuiIcon } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';

export const ErrorState = ({ onRetryLoadTemplates }: { onRetryLoadTemplates: () => void }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      data-test-subj="selectTemplateStep"
      direction="column"
      alignItems="center"
      justifyContent="center"
      css={css({
        padding: euiTheme.size.l,
      })}
    >
      <EuiEmptyPrompt
        icon={<EuiIcon type="warning" color="warning" size="l" />}
        color="warning"
        data-test-subj="errorLoadingTemplates"
        title={
          <h2>
            <FormattedMessage
              id="xpack.createClassicStreamFlyout.selectTemplateStep.errorState.title"
              defaultMessage="We couldn't fetch your index templates"
            />
          </h2>
        }
        titleSize="xs"
        body={
          <p>
            <FormattedMessage
              id="xpack.createClassicStreamFlyout.selectTemplateStep.errorState.body"
              defaultMessage="Something has gone wrong on our end. Give it a moment, then try to fetch the available index templates again."
            />
          </p>
        }
        actions={
          <EuiButton
            color="warning"
            onClick={onRetryLoadTemplates}
            data-test-subj="retryLoadTemplatesButton"
          >
            <FormattedMessage
              id="xpack.createClassicStreamFlyout.selectTemplateStep.errorState.retryButton"
              defaultMessage="Try again"
            />
          </EuiButton>
        }
      />
    </EuiFlexGroup>
  );
};
