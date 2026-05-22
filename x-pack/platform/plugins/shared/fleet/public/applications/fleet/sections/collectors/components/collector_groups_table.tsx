/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import type { CollectorGroup } from '../../../../../../common/types';

import { getSignalBadgeColor } from './signal_colors';

interface CollectorGroupsTableProps {
  groups: CollectorGroup[];
  isLoading: boolean;
  pageIndex: number;
  hasNextPage: boolean;
  onNextPage: () => void;
  onPreviousPage: () => void;
}

const CollectorGroupRow: React.FC<{ group: CollectorGroup }> = ({ group }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel hasBorder paddingSize="m" data-test-subj={`fleetCollectorGroup-${group.group}`}>
      <EuiFlexGroup alignItems="center" gutterSize="l" responsive={false}>
        <EuiFlexItem grow>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonIcon
                iconType="arrowRight"
                aria-label={i18n.translate('xpack.fleet.collectorGroups.expandRow', {
                  defaultMessage: 'Expand {group}',
                  values: { group: group.groupDisplayName },
                })}
                isDisabled
              />
            </EuiFlexItem>
            <EuiFlexItem grow>
              <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <strong>{group.groupDisplayName}</strong>
                  </EuiText>
                </EuiFlexItem>
                {group.signals.length > 0 && (
                  <EuiFlexItem grow={false}>
                    <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
                      {group.signals.map((signal) => {
                        const [bgColor, textColor] = getSignalBadgeColor(
                          euiTheme.colors.vis,
                          signal
                        );
                        return (
                          <EuiFlexItem grow={false} key={signal}>
                            <EuiBadge
                              color={bgColor}
                              css={css`
                                color: ${textColor};
                              `}
                            >
                              {signal}
                            </EuiBadge>
                          </EuiFlexItem>
                        );
                      })}
                    </EuiFlexGroup>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" gutterSize="l" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <FormattedMessage
                      id="xpack.fleet.collectorGroups.collectorsLabel"
                      defaultMessage="Collectors"
                    />
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{group.docCount}</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>

            <EuiFlexItem
              grow={false}
              css={{ width: 1, alignSelf: 'stretch', backgroundColor: euiTheme.colors.lightShade }}
            />

            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="s">
                    <FormattedMessage
                      id="xpack.fleet.collectorGroups.alertsLabel"
                      defaultMessage="Alerts:"
                    />
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">0</EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>

            <EuiFlexItem
              grow={false}
              css={{ width: 1, alignSelf: 'stretch', backgroundColor: euiTheme.colors.lightShade }}
            />

            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="s" iconType="arrowDown" iconSide="right" isDisabled>
                <FormattedMessage
                  id="xpack.fleet.collectorGroups.takeAction"
                  defaultMessage="Take action"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const CollectorGroupsTable: React.FC<CollectorGroupsTableProps> = ({
  groups,
  isLoading,
  pageIndex,
  hasNextPage,
  onNextPage,
  onPreviousPage,
}) => {
  if (isLoading && groups.length === 0) {
    return (
      <EuiFlexGroup justifyContent="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="l" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return (
    <div data-test-subj="fleetCollectorGroupsList">
      {groups.map((group) => (
        <React.Fragment key={group.group}>
          <CollectorGroupRow group={group} />
          <EuiSpacer size="s" />
        </React.Fragment>
      ))}

      <EuiFlexGroup justifyContent="flexEnd" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType="arrowLeft"
            onClick={onPreviousPage}
            isDisabled={pageIndex === 0}
            data-test-subj="fleetCollectorGroupsPrevPage"
          >
            <FormattedMessage
              id="xpack.fleet.collectorGroups.previousPage"
              defaultMessage="Previous"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            size="s"
            iconType="arrowRight"
            iconSide="right"
            onClick={onNextPage}
            isDisabled={!hasNextPage}
            data-test-subj="fleetCollectorGroupsNextPage"
          >
            <FormattedMessage id="xpack.fleet.collectorGroups.nextPage" defaultMessage="Next" />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};
