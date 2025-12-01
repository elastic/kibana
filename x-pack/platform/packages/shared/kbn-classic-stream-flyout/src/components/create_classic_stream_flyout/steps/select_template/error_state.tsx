/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiCallOut, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
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
      <EuiCallOut
        title={i18n.translate(
          'xpack.createClassicStreamFlyout.selectTemplateStep.errorState.title',
          {
            defaultMessage: "We couldn't fetch your index templates",
          }
        )}
        color="warning"
        iconType="warning"
        announceOnMount
        data-test-subj="errorLoadingTemplates"
      >
        <p>
          <FormattedMessage
            id="xpack.createClassicStreamFlyout.selectTemplateStep.errorState.body"
            defaultMessage="Something has gone wrong on our end. Give it a moment, then try to fetch the available index templates again."
          />
        </p>
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
      </EuiCallOut>
    </EuiFlexGroup>
  );
};
