/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { memo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiDescribedFormGroup, EuiFormRow, EuiLink, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { useMlKibana } from '../../../../../../../../../contexts/kibana';

export const Description: FC<PropsWithChildren<unknown>> = memo(({ children }) => {
  const {
    services: { docLinks },
  } = useMlKibana();
  const { euiTheme } = useEuiTheme();
  const docsUrl = docLinks.links.ml.customUrls;
  const title = i18n.translate(
    'xpack.ml.newJob.wizard.jobDetailsStep.additionalSection.customUrls.title',
    {
      defaultMessage: 'Custom URLs',
    }
  );

  const styles = {
    describeForm: css`
      /* Apply column layout only on screens wider than 768px */
      @media (min-width: 769px) {
        &.euiDescribedFormGroup {
          flex-direction: column;
        }
      }

      /* Widen the Custom URL fields */
      .euiDescribedFormGroup__fieldWrapper,
      .euiDescribedFormGroup__fields {
        max-width: none;
        width: 100%;
      }

      > .euiFlexGroup {
        > .euiFlexItem {
          &:last-child {
            flex-basis: 50%;
          }
        }
      }
    `,
    formRow: css`
      margin: 0 ${euiTheme.size.s};
    `,
  };

  return (
    <EuiDescribedFormGroup
      gutterSize="xs"
      fullWidth
      css={styles.describeForm}
      title={<h3>{title}</h3>}
      description={
        <FormattedMessage
          id="xpack.ml.newJob.wizard.jobDetailsStep.additionalSection.customUrlsSelection.description"
          defaultMessage="Provide links from anomalies to Kibana dashboards, Discover, or other web pages. {learnMoreLink}"
          values={{
            learnMoreLink: (
              <EuiLink href={docsUrl} target="_blank">
                <FormattedMessage
                  id="xpack.ml.newJob.wizard.jobDetailsStep.additionalSection.customUrlsSelection.learnMoreLinkText"
                  defaultMessage="Learn more"
                />
              </EuiLink>
            ),
          }}
        />
      }
    >
      <EuiFormRow fullWidth css={styles.formRow}>
        <>{children}</>
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
});
