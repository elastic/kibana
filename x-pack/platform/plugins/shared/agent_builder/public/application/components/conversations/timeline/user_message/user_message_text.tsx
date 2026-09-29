/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import {
  euiTextTruncate,
  useEuiTheme,
  EuiToolTip,
  EuiIcon,
  EuiLink,
  EuiMarkdownFormat,
  getDefaultEuiMarkdownParsingPlugins,
  getDefaultEuiMarkdownProcessingPlugins,
} from '@elastic/eui';
import type { PluggableList } from 'unified';
import { sortedCommandDefinitions } from '../../conversation_input/message_editor/command_menu';
import { COMMAND_BADGE_MAX_WIDTH_CH } from '../../conversation_input/message_editor/command_badge/constants';
import { IMAGE_ATTACHMENT_SCHEME } from '../../conversation_input/message_editor/image_placeholder';

interface UserMessageTextProps {
  text: string;
  onHoverImage?: (name: string | null) => void;
}

// Badges are serialized as markdown links, e.g. `[/Summarize](skill://skill-1)`. EUI's markdown
// parser only allows http(s)/mailto links by default and rewrites anything else back to literal
// text, so badge schemes must be allow-listed here to survive parsing as links.
const COMMAND_SCHEMES = new Set(sortedCommandDefinitions.map((definition) => definition.scheme));
const ALLOWED_LINK_PROTOCOLS = [
  'https:',
  'http:',
  'mailto:',
  ...sortedCommandDefinitions.map((definition) => `${definition.scheme}:`),
  `${IMAGE_ATTACHMENT_SCHEME}:`,
];

const parseSchemeAndPath = (href: string): { scheme: string; path: string } | undefined => {
  const match = /^(\w+):\/\/([^?]*)/.exec(href);
  return match ? { scheme: match[1], path: match[2] } : undefined;
};

const decodeBadgeName = (path: string): string => {
  try {
    return decodeURIComponent(path);
  } catch {
    // Malformed percent-encoding, fall back to the raw path.
    return path;
  }
};

const useUserMessageTextStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    // Mirrors ChatMessageText's container tweaks so list spacing matches the assistant side —
    // EUI's markdown defaults render lists looser than this bubble's compact style wants.
    container: css`
      overflow-wrap: anywhere;

      ol > li:not(:first-child) {
        margin-top: ${euiTheme.size.s};
      }

      ol > li > p {
        margin-bottom: ${euiTheme.size.s};
      }

      .euiMarkdownFormat > ul > li,
      .euiMarkdownFormat > ol > li {
        line-height: ${euiTheme.size.l};
      }
    `,
    badge: css`
      color: ${euiTheme.colors.textPrimary};
      background-color: ${euiTheme.colors.backgroundLightPrimary};
      border-radius: ${euiTheme.border.radius.small};
      padding: 0 ${euiTheme.size.xs};
    `,
    commandBadgeWrapper: css`
      display: inline-flex;
      align-items: baseline;
      max-width: ${COMMAND_BADGE_MAX_WIDTH_CH}ch;
      min-width: 0;
      vertical-align: baseline;
      line-height: inherit;
    `,
    commandBadgeInner: css`
      min-width: 0;
      ${euiTextTruncate('100%')}
    `,
    imageBadgeWrapper: css`
      display: inline-flex;
      align-items: center;
      gap: ${euiTheme.size.xs};
      min-width: 0;
      max-width: 24ch;
      font-size: ${euiTheme.size.base};
      height: 20px;
      background: ${euiTheme.colors.backgroundFilledPrimary};
      color: ${euiTheme.colors.textInverse};
      border-radius: ${euiTheme.border.radius.small};
      padding: 0 ${euiTheme.size.xs};
      &:hover {
        background: ${euiTheme.colors.textPrimary};
      }
    `,
    imageBadgeInner: css`
      min-width: 0;
      ${euiTextTruncate('100%')}
    `,
  };
};

export const UserMessageText: React.FC<UserMessageTextProps> = ({ text, onHoverImage }) => {
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
      a: ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
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
          <EuiLink {...rest} href={href} target="_blank" rel="noreferrer" external={false}>
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
  }, [styles, onHoverImage]);

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
