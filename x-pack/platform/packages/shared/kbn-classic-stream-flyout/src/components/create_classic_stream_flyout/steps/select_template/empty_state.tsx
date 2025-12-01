/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexGroup, EuiEmptyPrompt, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';

export const EmptyState = ({ onCreateTemplate }: { onCreateTemplate: () => void }) => {
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
        title={
          <h2>
            <FormattedMessage
              id="xpack.createClassicStreamFlyout.selectTemplateStep.emptyState.title"
              defaultMessage="No index templates detected"
            />
          </h2>
        }
        titleSize="s"
        body={
          <p>
            <FormattedMessage
              id="xpack.createClassicStreamFlyout.selectTemplateStep.emptyState.body"
              defaultMessage="To create a new classic stream, you must select an index template that will be used to set the initial settings for the new stream. Currently, you don’t have any index templates. Create a new index template first, then return here to create a classic stream."
            />
          </p>
        }
        actions={
          <EuiButton
            color="primary"
            onClick={onCreateTemplate}
            data-test-subj="createTemplateButton"
          >
            <FormattedMessage
              id="xpack.createClassicStreamFlyout.selectTemplateStep.emptyState.createButton"
              defaultMessage="Create index template"
            />
          </EuiButton>
        }
      />
    </EuiFlexGroup>
  );
};
