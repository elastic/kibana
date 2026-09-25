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
  EuiText,
  EuiTextBlockTruncate,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, FormattedRelative } from '@kbn/i18n-react';
import React, { useRef, useState } from 'react';
import type { AiIndexHttpItem } from '../../../../common/http_api/ai_indices';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import { AI_INDEX_TYPE_LABEL } from './labels';

const AiIndexCardFooter = ({ aiIndex }: { aiIndex: AiIndexHttpItem }) => (
  <>
    <EuiHorizontalRule margin="s" />
    <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
      <EuiFlexItem grow={false} data-test-subj="contextAiIndexCardUpdated">
        <EuiText size="xs" color="subdued" textAlign="right">
          <FormattedMessage
            id="xpack.contextEngine.landing.card.updated"
            defaultMessage="Updated"
          />
        </EuiText>
        <EuiText size="s" textAlign="right">
          <FormattedRelative value={aiIndex.date_modified} />
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
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
      hasShadow
      paddingSize="l"
      data-test-subj="contextAiIndexCard"
      onClick={openCard}
    >
      <EuiFlexGroup direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
            <EuiFlexItem>
              <EuiFlexGroup gutterSize="s" alignItems="baseline" responsive={false}>
                <EuiFlexItem>
                  {/* Must stay wrappable: `1fr` grid tracks size to the card's min-content width. */}
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
                  <EuiText
                    component="span"
                    size="xs"
                    color="subdued"
                    data-test-subj="contextAiIndexCardType"
                  >
                    {AI_INDEX_TYPE_LABEL[aiIndex.dest.type]}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
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
                              { defaultMessage: 'This AI index is managed and cannot be deleted.' }
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

        {aiIndex.managed && (
          <EuiFlexItem grow={false}>
            <EuiBadgeGroup gutterSize="s">
              <EuiBadge color="hollow" iconType="lock" data-test-subj="contextAiIndexCardManaged">
                <FormattedMessage
                  id="xpack.contextEngine.landing.card.managed"
                  defaultMessage="Managed"
                />
              </EuiBadge>
            </EuiBadgeGroup>
          </EuiFlexItem>
        )}

        {aiIndex.description !== undefined && (
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued" data-test-subj="contextAiIndexCardDescription">
              <EuiTextBlockTruncate lines={2} className="eui-textBreakWord">
                {aiIndex.description}
              </EuiTextBlockTruncate>
            </EuiText>
          </EuiFlexItem>
        )}

        <EuiFlexItem grow={false}>
          <EuiBadgeGroup gutterSize="s">
            <EuiBadge color="hollow" iconType="document" data-test-subj="contextAiIndexCardSources">
              <FormattedMessage
                id="xpack.contextEngine.landing.card.sourcesCount"
                defaultMessage="{count, plural, one {# source} other {# sources}}"
                values={{ count: aiIndex.sources.length }}
              />
            </EuiBadge>
            <EuiBadge color="hollow" iconType="gear" data-test-subj="contextAiIndexCardAutomations">
              <FormattedMessage
                id="xpack.contextEngine.landing.card.automationsCount"
                defaultMessage="{count, plural, one {# automation} other {# automations}}"
                values={{ count: aiIndex.automations.length }}
              />
            </EuiBadge>
          </EuiBadgeGroup>
        </EuiFlexItem>
        {footer !== undefined && <EuiFlexItem grow={false}>{footer}</EuiFlexItem>}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
