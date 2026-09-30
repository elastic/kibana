/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiMarkdownFormat } from '@elastic/eui';
import { createUserMessageMarkdownPlugins } from './user_message_markdown_plugins';
import { useUserMessageTextStyles } from './user_message_text.styles';

interface UserMessageTextProps {
  text: string;
  onHoverImage?: (name: string | null) => void;
}

export const UserMessageText: React.FC<UserMessageTextProps> = ({ text, onHoverImage }) => {
  const styles = useUserMessageTextStyles();

  const { parsingPluginList, processingPluginList } = useMemo(
    () => createUserMessageMarkdownPlugins({ styles, onHoverImage }),
    [styles, onHoverImage]
  );

  return (
    <div css={styles.container}>
      <EuiMarkdownFormat
        textSize="s"
        parsingPluginList={parsingPluginList}
        processingPluginList={processingPluginList}
      >
        {text}
      </EuiMarkdownFormat>
    </div>
  );
};
