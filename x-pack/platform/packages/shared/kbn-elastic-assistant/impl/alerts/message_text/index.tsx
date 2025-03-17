/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiTable,
  EuiTableRow,
  EuiTableRowCell,
  EuiTableHeaderCell,
  EuiMarkdownFormat,
  EuiSpacer,
  EuiText,
  getDefaultEuiMarkdownParsingPlugins,
  getDefaultEuiMarkdownProcessingPlugins,
} from '@elastic/eui';
import type { ContentReferences } from '@kbn/elastic-assistant-common';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';
import { contentReferenceParser } from './content_reference_parser';
import { customCodeBlockLanguagePlugin } from './custom_codeblock_markdown_plugin';
import { CustomCodeBlock } from './custom_code_block';

export type StreamingOrFinalContentReferences = ContentReferences | undefined | null;
interface Props {
  contentReferences: StreamingOrFinalContentReferences;
  content: string;
  ['data-test-subj']?: string;
}

interface GetPluginDependencies {
  contentReferences: StreamingOrFinalContentReferences;
}

const getPluginDependencies = ({ contentReferences }: GetPluginDependencies) => {
  const parsingPlugins = getDefaultEuiMarkdownParsingPlugins();

  const processingPlugins = getDefaultEuiMarkdownProcessingPlugins();

  const { components } = processingPlugins[1][1];

  processingPlugins[1][1].components = {
    ...components,
    contentReference: () => {
      return null;
    },
    customCodeBlock: (props) => {
      return (
        <>
          <CustomCodeBlock value={props.value} lang={props.lang} />
          <EuiSpacer size="m" />
        </>
      );
    },
    table: (props) => (
      <>
        <EuiTable {...props} />
        <EuiSpacer size="m" />
      </>
    ),
    th: (props) => {
      const { children, ...rest } = props;
      return <EuiTableHeaderCell {...rest}>{children}</EuiTableHeaderCell>;
    },
    tr: (props) => <EuiTableRow {...props} />,
    td: (props) => {
      const { children, ...rest } = props;
      return (
        <EuiTableRowCell truncateText={true} {...rest}>
          {children}
        </EuiTableRowCell>
      );
    },
  };

  return {
    parsingPluginList: [
      customCodeBlockLanguagePlugin,
      ...parsingPlugins,
      contentReferenceParser({ contentReferences }),
    ],
    processingPluginList: processingPlugins,
  };
};

export function MessageText({ contentReferences, content, 'data-test-subj': dataTestSubj }: Props) {
  const containerCss = css`
    overflow-wrap: anywhere;
  `;

  const { parsingPluginList, processingPluginList } = useMemo(
    () => getPluginDependencies({ contentReferences }),
    [contentReferences]
  );

  return (
    <EuiText css={containerCss} data-test-subj={dataTestSubj}>
      <EuiMarkdownFormat
        // TODO this cant be right
        // used by augmentMessageCodeBlocks
        className={`message-0`}
        data-test-subj={'messageText'}
        parsingPluginList={parsingPluginList}
        processingPluginList={processingPluginList}
        textSize="s"
      >
        {content}
      </EuiMarkdownFormat>
    </EuiText>
  );
}
