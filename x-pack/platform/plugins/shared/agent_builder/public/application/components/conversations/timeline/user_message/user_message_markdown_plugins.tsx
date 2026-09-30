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
  EuiLink,
  getDefaultEuiMarkdownParsingPlugins,
  getDefaultEuiMarkdownProcessingPlugins,
} from '@elastic/eui';
import type { PluggableList } from 'unified';
import { sortedCommandDefinitions } from '../../conversation_input/message_editor/command_menu';
import { IMAGE_ATTACHMENT_SCHEME } from '../../conversation_input/message_editor/image_placeholder';
import { useUserMessageTextStyles, type UserMessageTextStyles } from './user_message_text.styles';

// Badges are serialized as markdown links, e.g. `[/Summarize](skill://skill-1)`. EUI's markdown
// parser only allows http(s)/mailto links by default and rewrites anything else back to literal
// text, so badge schemes must be allow-listed here to survive parsing as links.
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
  onLinkClick?: (href: string, e: React.MouseEvent<HTMLAnchorElement>) => void;
}

interface UserMessageMarkdownPlugins {
  parsingPluginList: PluggableList;
  processingPluginList: PluggableList;
  styles: UserMessageTextStyles;
}

/**
 * Builds the parsing/processing plugin lists that make `EuiMarkdownFormat` render user message
 * text: badge schemes are allow-listed as links, and a custom `a` renderer turns those links back
 * into badges (image / command) while everything else renders as a plain link whose clicks are
 * delegated to `onLinkClick`.
 */
export const useUserMessageMarkdownPlugins = ({
  onHoverImage,
  onLinkClick,
}: UseUserMessageMarkdownPluginsArgs = {}): UserMessageMarkdownPlugins => {
  const styles = useUserMessageTextStyles();

  const { parsingPluginList, processingPluginList } = useMemo(() => {
    const parsingPlugins = getDefaultEuiMarkdownParsingPlugins({
      linkValidator: { allowProtocols: ALLOWED_LINK_PROTOCOLS },
    });

    const defaultProcessingPlugins = getDefaultEuiMarkdownProcessingPlugins();
    const [remarkToRehypePlugin, remarkToRehypeOptions] = defaultProcessingPlugins[0];
    const [rehypeToReactPlugin, rehypeToReactOptions] = defaultProcessingPlugins[1];

    rehypeToReactOptions.components = {
      ...rehypeToReactOptions.components,
      a: ({
        href,
        children,
        type,
        color,
        ...rest
      }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
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

        return (
          <EuiLink
            {...rest}
            href={href}
            target="_blank"
            rel="noreferrer"
            external={false}
            onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
              if (href && onLinkClick) onLinkClick(href, e);
            }}
          >
            {children}
          </EuiLink>
        );
      },
    };

    return {
      parsingPluginList: parsingPlugins,
      processingPluginList: [
        [remarkToRehypePlugin, remarkToRehypeOptions],
        [rehypeToReactPlugin, rehypeToReactOptions],
      ] as PluggableList,
    };
  }, [styles, onHoverImage, onLinkClick]);

  return { parsingPluginList, processingPluginList, styles };
};
