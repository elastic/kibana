/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useState } from 'react';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiListGroup,
  EuiListGroupItem,
  EuiText,
  EuiTextColor,
  EuiTitle,
} from '@elastic/eui';

import { Index } from '../../../../../../../common';
import { OverviewCard } from './overview_card';

const MAX_VISIBLE_ALIASES = 3;

export const AliasesDetails: FunctionComponent<{ aliases: Index['aliases'] }> = ({ aliases }) => {
  const [isShowingAliases, setIsShowingAliases] = useState<boolean>(false);
  if (!Array.isArray(aliases)) {
    return null;
  }
  const aliasesBadges = aliases.slice(0, MAX_VISIBLE_ALIASES).map((alias) => (
    <EuiBadge
      key={alias}
      css={css`
        max-width: 250px;
      `}
    >
      {alias}
    </EuiBadge>
  ));
  return (
    <>
      <OverviewCard
        data-test-subj="indexDetailsAliases"
        title={i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.aliases.cardTitle', {
          defaultMessage: 'Aliases',
        })}
        content={{
          left: (
            <EuiFlexGroup gutterSize="xs" alignItems="baseline">
              <EuiFlexItem grow={false}>
                <EuiText
                  css={css`
                    font-size: ${euiThemeVars.euiFontSizeL};
                  `}
                >
                  {aliases.length}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiTextColor color="subdued">
                  {i18n.translate(
                    'xpack.idxMgmt.indexDetails.overviewTab.aliases.aliasesCountLabel',
                    {
                      defaultMessage: '{aliases, plural, one {Alias} other {Aliases}}',
                      values: { aliases: aliases.length },
                    }
                  )}
                </EuiTextColor>
              </EuiFlexItem>
            </EuiFlexGroup>
          ),
          right: (
            <EuiButton
              size="s"
              onClick={() => {
                setIsShowingAliases(true);
              }}
            >
              View all aliases
            </EuiButton>
          ),
        }}
        footer={{
          left: (
            <EuiBadgeGroup gutterSize="s">
              {aliasesBadges}
              {aliases.length > MAX_VISIBLE_ALIASES && (
                <EuiBadge color="hollow">+{aliases.length - MAX_VISIBLE_ALIASES}</EuiBadge>
              )}
            </EuiBadgeGroup>
          ),
        }}
      />
      {isShowingAliases && (
        <EuiFlyout ownFocus onClose={() => setIsShowingAliases(false)}>
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="m">
              <h2>
                {i18n.translate('xpack.idxMgmt.indexDetails.overviewTab.aliases.cardTitle', {
                  defaultMessage: 'Aliases',
                })}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiListGroup maxWidth={false}>
              {aliases.map((alias) => (
                <EuiListGroupItem wrapText={true} key={alias} label={alias} />
              ))}
            </EuiListGroup>
          </EuiFlyoutBody>
        </EuiFlyout>
      )}
    </>
  );
};
