/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React, { memo } from 'react';
import { EuiDescribedFormGroup, EuiFormRow, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

interface CustomUrlsDescriptionProps {
  description: React.ReactElement;
}

export const CustomUrlsDescription: FC<PropsWithChildren<CustomUrlsDescriptionProps>> = memo(
  ({ children, description }) => {
    const { euiTheme } = useEuiTheme();

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
        description={description}
      >
        <EuiFormRow fullWidth css={styles.formRow}>
          <>{children}</>
        </EuiFormRow>
      </EuiDescribedFormGroup>
    );
  }
);
