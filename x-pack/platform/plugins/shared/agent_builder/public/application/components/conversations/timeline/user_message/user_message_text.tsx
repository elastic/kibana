/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiMarkdownFormat } from '@elastic/eui';
import { useMarkdownLinkClick } from '../response/use_markdown_link_click';
import {
  escapeCommandBadgeLabels,
  useUserMessageMarkdownPlugins,
} from './user_message_markdown_plugins';

interface UserMessageTextProps {
  text: string;
  onHoverImage?: (name: string | null) => void;
}

export const UserMessageText: React.FC<UserMessageTextProps> = ({ text, onHoverImage }) => {
  const { handleLinkClick, externalLinkModal } = useMarkdownLinkClick();

  const { parsingPluginList, processingPluginList, styles } = useUserMessageMarkdownPlugins({
    onHoverImage,
    onLinkClick: handleLinkClick,
  });
  const markdown = useMemo(() => escapeCommandBadgeLabels(text), [text]);

  return (
    <>
      <div css={styles.container}>
        <EuiMarkdownFormat
          textSize="s"
          parsingPluginList={parsingPluginList}
          processingPluginList={processingPluginList}
        >
          {markdown}
        </EuiMarkdownFormat>
      </div>
      {externalLinkModal}
    </>
  );
};
