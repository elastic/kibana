/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { memo } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiDescribedFormGroup, EuiFormRow, EuiLink, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useMlKibana } from '../../contexts/kibana';

interface DescriptionPanelProps {
  descriptionMessageId: string;
  descriptionDefaultMessage: string;
  docsUrlPath?: string;
}

export const CustomUrlsDescription: FC<PropsWithChildren<DescriptionPanelProps>> = memo(
  ({ children, descriptionMessageId, descriptionDefaultMessage, docsUrlPath = 'customUrls' }) => {
    const {
      services: { docLinks },
    } = useMlKibana();
    const { euiTheme } = useEuiTheme();
    const docsUrl = docLinks.links.ml[docsUrlPath];

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

    const title = i18n.translate(
      'xpack.ml.public.application.components.customUrls.customUrlsDescription.title',
      {
        defaultMessage: 'Custom URLs',
      }
    );

    return (
      <EuiDescribedFormGroup
        gutterSize="xs"
        fullWidth
        css={styles.describeForm}
        title={<h3>{title}</h3>}
        description={
          <FormattedMessage
            id={descriptionMessageId}
            defaultMessage={descriptionDefaultMessage}
            values={{
              learnMoreLink: (
                <EuiLink href={docsUrl} target="_blank">
                  <FormattedMessage
                    id="xpack.ml.public.application.components.customUrls.customUrlsDescription.learnMoreLink"
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
  }
);
