/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiEmptyPromptProps } from '@elastic/eui';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLink,
  EuiTitle,
} from '@elastic/eui';
import type { SerializedStyles } from '@emotion/react';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';

export const MLEmptyPromptCard = ({
  title,
  body,
  actions,
  iconSrc,
  iconAlt,
  customCss,
  iconSize = 'm',
  docsLink,
  docsLinkDataTestSubj,
  footer,
  layout = 'horizontal',
  color = 'plain',
  hasBorder,
  hasShadow,
  titleSize,
  paddingSize,
  centered = false,
  'data-test-subj': dataTestSubj,
}: Omit<EuiEmptyPromptProps, 'title' | 'icon'> & {
  title: string;
  iconSrc: string;
  iconAlt: string;
  iconSize?: 'fullWidth' | 'original' | 's' | 'm' | 'l' | 'xl';
  customCss?: SerializedStyles;
  docsLink?: string;
  docsLinkDataTestSubj?: string;
  centered?: boolean;
}) => {
  const titleElement = titleSize === 's' || titleSize === 'xs' ? 'h3' : 'h2';
  const TitleTag = titleElement;

  const docsFooter =
    docsLink !== undefined ? (
      <>
        <EuiTitle size="xxs">
          <span>
            <FormattedMessage id="xpack.ml.common.needHelp" defaultMessage="Need help?" />
          </span>
        </EuiTitle>{' '}
        <EuiLink href={docsLink} target="_blank" data-test-subj={docsLinkDataTestSubj}>
          <FormattedMessage
            id="xpack.ml.common.readDocumentationLink"
            defaultMessage="Read documentation"
          />
        </EuiLink>
      </>
    ) : (
      footer
    );

  const prompt = (
    <EuiEmptyPrompt
      css={css`
        .euiEmptyPrompt__icon {
          min-inline-size: 32px !important;
        }
        ${customCss ?? ''}
      `}
      layout={layout}
      color={color}
      hasBorder={hasBorder}
      hasShadow={hasShadow}
      icon={<EuiImage size={iconSize} src={iconSrc} alt={iconAlt} />}
      title={<TitleTag>{title}</TitleTag>}
      titleSize={titleSize}
      body={body}
      actions={actions}
      footer={docsFooter}
      paddingSize={paddingSize}
      data-test-subj={dataTestSubj}
    />
  );

  if (!centered) {
    return prompt;
  }

  return (
    <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: '60vh' }}>
      <EuiFlexItem grow={false}>{prompt}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
