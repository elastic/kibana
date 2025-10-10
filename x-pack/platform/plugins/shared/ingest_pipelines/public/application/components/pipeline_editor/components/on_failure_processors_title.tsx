/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { css } from '@emotion/react';

import { useKibana } from '../../../../shared_imports';

const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  return {
    title: css`
      padding-left: ${euiTheme.size.s};
    `,
  };
};

export const OnFailureProcessorsTitle: FunctionComponent = () => {
  const { services } = useKibana();
  const styles = useStyles();

  return (
    <div css={styles.title}>
      <EuiTitle size="xs">
        <h4>
          <FormattedMessage
            id="xpack.ingestPipelines.pipelineEditor.onFailureTreeTitle"
            defaultMessage="Failure processors"
          />
        </h4>
      </EuiTitle>
      <EuiText size="s" color="subdued">
        <FormattedMessage
          id="xpack.ingestPipelines.pipelineEditor.onFailureTreeDescription"
          defaultMessage="The processors used to handle exceptions in this pipeline. {learnMoreLink}"
          values={{
            learnMoreLink: (
              <EuiLink
                href={services.documentation.getHandlingFailureUrl()}
                target="_blank"
                external
              >
                {i18n.translate(
                  'xpack.ingestPipelines.pipelineEditor.onFailureProcessorsDocumentationLink',
                  {
                    defaultMessage: 'Learn more.',
                  }
                )}
              </EuiLink>
            ),
          }}
        />
      </EuiText>
    </div>
  );
};
