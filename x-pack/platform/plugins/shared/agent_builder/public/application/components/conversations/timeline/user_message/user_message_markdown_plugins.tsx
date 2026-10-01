/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiToolTip,
  EuiIcon,
  getDefaultEuiMarkdownParsingPlugins,
  getDefaultEuiMarkdownProcessingPlugins,
} from '@elastic/eui';
import type { PluggableList } from 'unified';
import { sortedCommandDefinitions } from '../../conversation_input/message_editor/command_menu';
import { IMAGE_ATTACHMENT_SCHEME } from '../../conversation_input/message_editor/image_placeholder';
import {
  createConversationMarkdownComponents,
  esqlLanguagePlugin,
} from '../response/markdown_plugins';
import {
  useUserMessageTextStyles,
  type UserMessageTextStyles,
} from './use_user_message_text_styles';

// Badges are markdown links, e.g. `[/Summarize](skill://skill-1)`. EUI's parser drops links that
// are not http(s)/mailto, so badge schemes must be allow-listed.
export const COMMAND_SCHEMES = new Set(
  sortedCommandDefinitions.map((definition) => definition.scheme)
);

export const ALLOWED_LINK_PROTOCOLS = [
  'https:',
  'http:',
  'mailto:',
  ...sortedCommandDefinitions.map((definition) => `${definition.scheme}:`),
  `${IMAGE_ATTACHMENT_SCHEME}:`,
];

export const parseSchemeAndPath = (href: string): { scheme: string; path: string } | undefined => {
  const match = /^(\w+):\/\/([^?]*)/.exec(href);
  return match ? { scheme: match[1], path: match[2] } : undefined;
};

export const decodeBadgeName = (path: string): string => {
  try {
    return decodeURIComponent(path);
  } catch {
    // Malformed percent-encoding, fall back to the raw path.
    return path;
  }
};

interface UseUserMessageMarkdownPluginsArgs {
  onHoverImage?: (name: string | null) => void;
  onLinkClick: (href: string, e: React.MouseEvent<HTMLAnchorElement>) => void;
}

interface UserMessageMarkdownPlugins {
  parsingPluginList: PluggableList;
  processingPluginList: PluggableList;
  styles: UserMessageTextStyles;
}

/** Markdown plugins for user messages. Badge links render as badges. */
export const useUserMessageMarkdownPlugins = ({
  onHoverImage,
  onLinkClick,
}: UseUserMessageMarkdownPluginsArgs): UserMessageMarkdownPlugins => {
  const styles = useUserMessageTextStyles();

  const { parsingPluginList, processingPluginList } = useMemo(() => {
    const parsingPlugins = getDefaultEuiMarkdownParsingPlugins({
      linkValidator: { allowProtocols: ALLOWED_LINK_PROTOCOLS },
    });

    const defaultProcessingPlugins = getDefaultEuiMarkdownProcessingPlugins();
    const [remarkToRehypePlugin, remarkToRehypeOptions] = defaultProcessingPlugins[0];
    const [rehypeToReactPlugin, rehypeToReactOptions] = defaultProcessingPlugins[1];

    const { a: MarkdownLink, ...conversationComponents } = createConversationMarkdownComponents({
      onLinkClick,
    });

    rehypeToReactOptions.components = {
      ...rehypeToReactOptions.components,
      ...conversationComponents,
      a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
        const { href, children } = props;
        const parsed = href ? parseSchemeAndPath(href) : undefined;

        if (parsed?.scheme === IMAGE_ATTACHMENT_SCHEME) {
          const name = decodeBadgeName(parsed.path);
          return (
            <EuiToolTip content={name} disableScreenReaderOutput>
              <span
                css={styles.imageBadgeWrapper}
                tabIndex={0}
                onMouseEnter={onHoverImage ? () => onHoverImage(name) : undefined}
                onMouseLeave={onHoverImage ? () => onHoverImage(null) : undefined}
              >
                <EuiIcon type="image" size="s" aria-hidden={true} />
                <span className="image-badge-label" css={styles.imageBadgeInner}>
                  {name}
                </span>
              </span>
            </EuiToolTip>
          );
        }

        if (parsed && COMMAND_SCHEMES.has(parsed.scheme)) {
          return (
            <EuiToolTip content={children} disableScreenReaderOutput>
              <span css={[styles.badge, styles.commandBadgeWrapper]} tabIndex={0}>
                <span css={styles.commandBadgeInner}>{children}</span>
              </span>
            </EuiToolTip>
          );
        }

        return <MarkdownLink {...props} />;
      },
    };

    return {
      parsingPluginList: [esqlLanguagePlugin, ...parsingPlugins],
      processingPluginList: [
        [remarkToRehypePlugin, remarkToRehypeOptions],
        [rehypeToReactPlugin, rehypeToReactOptions],
      ] as PluggableList,
    };
  }, [styles, onHoverImage, onLinkClick]);

  return { parsingPluginList, processingPluginList, styles };
};
