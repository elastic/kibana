/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBadgeGroup,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiText,
  EuiTextBlockTruncate,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import React, { useRef, useState } from 'react';
import type { AiIndexHttpItem } from '../../../../common/http_api/ai_indices';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';

// Reserve height so cards align when descriptions are shorter than the truncate limit.
const getDescriptionSlotStyles = (lineCount: number) => css`
  min-height: ${lineCount}lh;
`;

const USER_INDEX_DESCRIPTION_LINES = 2;
const MANAGED_DESCRIPTION_LINES = 5;

const AiIndexCardFooter = ({ aiIndex }: { aiIndex: AiIndexHttpItem }) => (
  <>
    <EuiHorizontalRule margin="m" />
    <EuiText size="xs" color="subdued" textAlign="right" data-test-subj="contextAiIndexCardUpdated">
      <FormattedMessage
        id="xpack.contextEngine.landing.card.updated"
        defaultMessage="Updated {time}"
        values={{
          time: <FormattedRelative value={aiIndex.date_modified} />,
        }}
      />
    </EuiText>
  </>
);

interface AiIndexCardProps {
  aiIndex: AiIndexHttpItem;
  href: string;
  onDeleteClick: () => void;
}

export const AiIndexCard = ({ aiIndex, href, onDeleteClick }: AiIndexCardProps) => {
  const titleLinkRef = useRef<HTMLAnchorElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const footer = aiIndex.managed ? undefined : <AiIndexCardFooter aiIndex={aiIndex} />;
  const needsSetup = !aiIndex.managed && aiIndex.automations.length === 0;
  const descriptionLines = aiIndex.managed
    ? MANAGED_DESCRIPTION_LINES
    : USER_INDEX_DESCRIPTION_LINES;
  const actionsAriaLabel = i18n.translate('xpack.contextEngine.landing.card.actionsAriaLabel', {
    defaultMessage: 'AI Index actions',
  });

  const openCard = (event: React.MouseEvent) => {
    // If the user clicks on a button or a link, it handles the click itself.
    if ((event.target as HTMLElement).closest('button, a')) {
      return;
    }
    titleLinkRef.current?.click();
  };

  // We can't use EuiCard because it doesn't allow us to track telemetry with EBT properties for the action menu.
  return (
    <EuiPanel
      element="div"
      hasBorder
      paddingSize="l"
      data-test-subj="contextAiIndexCard"
      onClick={openCard}
    >
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiTextBlockTruncate
            lines={1}
            className="eui-textBreakWord"
            title={aiIndex.id}
            data-test-subj="contextAiIndexCardTitle"
          >
            <EuiTitle size="xs">
              <h4>
                <EuiLink
                  href={href}
                  ref={titleLinkRef}
                  data-test-subj="contextAiIndexCardTitleLink"
                  {...getEbtProps({
                    element: CONTEXT_ENGINE_UI_EBT.element.aiIndexListPageCard,
                    action: CONTEXT_ENGINE_UI_EBT.action.aiIndexList.OPEN_CARD,
                  })}
                >
                  {aiIndex.id}
                </EuiLink>
              </h4>
            </EuiTitle>
          </EuiTextBlockTruncate>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            {(aiIndex.managed || needsSetup) && (
              <EuiFlexItem grow={false}>
                <EuiBadgeGroup gutterSize="s">
                  {aiIndex.managed ? (
                    <EuiBadge
                      color="hollow"
                      iconType="lock"
                      data-test-subj="contextAiIndexCardManaged"
                    >
                      <FormattedMessage
                        id="xpack.contextEngine.landing.card.managed"
                        defaultMessage="Managed"
                      />
                    </EuiBadge>
                  ) : (
                    <EuiBadge color="warning" data-test-subj="contextAiIndexCardNeedsSetup">
                      <FormattedMessage
                        id="xpack.contextEngine.landing.card.needsSetup"
                        defaultMessage="Needs setup"
                      />
                    </EuiBadge>
                  )}
                </EuiBadgeGroup>
              </EuiFlexItem>
            )}
            <EuiFlexItem grow={false}>
              <EuiPopover
                panelPaddingSize="none"
                anchorPosition="downRight"
                isOpen={isMenuOpen}
                closePopover={() => setIsMenuOpen(false)}
                aria-label={actionsAriaLabel}
                button={
                  <EuiToolTip content={actionsAriaLabel} disableScreenReaderOutput>
                    <EuiButtonIcon
                      iconType="ellipsis"
                      color="text"
                      data-test-subj="contextAiIndexCardActionsButton"
                      aria-label={actionsAriaLabel}
                      onClick={() => setIsMenuOpen((open) => !open)}
                      {...getEbtProps({
                        element: CONTEXT_ENGINE_UI_EBT.element.aiIndexListPageCard,
                        action: CONTEXT_ENGINE_UI_EBT.action.aiIndexList.CARD_ACTIONS_MENU,
                      })}
                    />
                  </EuiToolTip>
                }
              >
                <EuiContextMenuPanel
                  items={[
                    <EuiContextMenuItem
                      key="delete"
                      icon="trash"
                      hasAriaDisabled={aiIndex.managed}
                      disabled={aiIndex.managed}
                      toolTipContent={
                        aiIndex.managed
                          ? i18n.translate(
                              'xpack.contextEngine.landing.card.deleteActionManagedTooltip',
                              {
                                defaultMessage: 'This AI index is managed and cannot be deleted.',
                              }
                            )
                          : undefined
                      }
                      data-test-subj="contextAiIndexCardDeleteAction"
                      {...getEbtProps({
                        element: CONTEXT_ENGINE_UI_EBT.element.aiIndexListPageCard,
                        action: CONTEXT_ENGINE_UI_EBT.action.aiIndexList.DELETE,
                      })}
                      onClick={() => {
                        setIsMenuOpen(false);
                        onDeleteClick();
                      }}
                    >
                      <FormattedMessage
                        id="xpack.contextEngine.landing.card.deleteAction"
                        defaultMessage="Delete AI index"
                      />
                    </EuiContextMenuItem>,
                  ]}
                />
              </EuiPopover>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      <EuiFlexGroup direction="column" gutterSize="s">
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            color="subdued"
            data-test-subj="contextAiIndexCardDescription"
            css={getDescriptionSlotStyles(descriptionLines)}
          >
            <EuiTextBlockTruncate lines={descriptionLines} className="eui-textBreakWord">
              {aiIndex.description ?? ''}
            </EuiTextBlockTruncate>
          </EuiText>
        </EuiFlexItem>

        {!aiIndex.managed && (
          <EuiFlexItem grow={false}>
            <EuiBadgeGroup gutterSize="s">
              <EuiBadge
                color="hollow"
                iconType="document"
                data-test-subj="contextAiIndexCardSources"
              >
                <FormattedMessage
                  id="xpack.contextEngine.landing.card.sourcesCount"
                  defaultMessage="{count, plural, one {# source} other {# sources}}"
                  values={{ count: aiIndex.sources.length }}
                />
              </EuiBadge>
              <EuiBadge
                color="hollow"
                iconType="gear"
                data-test-subj="contextAiIndexCardAutomations"
              >
                <FormattedMessage
                  id="xpack.contextEngine.landing.card.automationsCount"
                  defaultMessage="{count, plural, one {# automation} other {# automations}}"
                  values={{ count: aiIndex.automations.length }}
                />
              </EuiBadge>
            </EuiBadgeGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      {footer}
    </EuiPanel>
  );
};
