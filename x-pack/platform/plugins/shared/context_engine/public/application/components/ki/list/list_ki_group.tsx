/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiIcon, EuiLink, EuiText } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useId } from 'react';
import { MAX_KI_PAGE_SIZE } from '../../../../../common/constants';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../common/telemetry';
import type { KiListItem } from '../../../../../common/http_api/knowledge_indicators';
import { kiLabelCapitalizeCss } from '../shared/ki_type_display';
import { getListKiTypeFilterLabel } from './list_ki_helpers';
import type { ListKiGroup as ListKiGroupData } from './list_ki_groups_helpers';
import { useListKiGroupsStyles } from './list_ki_groups_styles';
import { ListKiRow } from './list_ki_row';

interface ListKiGroupProps {
  group: ListKiGroupData;
  isFirst: boolean;
  isCollapsed: boolean;
  onToggle: (type: string) => void;
  isKiSelected: (ki: KiListItem) => boolean;
  onSelectKi: (ki: KiListItem) => void;
  onHoverKi: (ki: KiListItem) => void;
  onShowMore: (type: string, loadedCount: number) => void;
  discoverHref?: string;
}

const CapReachedMessage = ({ discoverHref }: { discoverHref?: string }) => (
  <EuiText size="xs" color="subdued" data-test-subj="contextListKiCapReached">
    <p>
      {discoverHref ? (
        <FormattedMessage
          id="xpack.contextEngine.aiIndexDetail.listKi.groupCapReachedWithDiscover"
          defaultMessage="Showing the first {count} of this type. {discoverLink} to view all Knowledge documents."
          values={{
            count: MAX_KI_PAGE_SIZE,
            discoverLink: (
              <EuiLink
                href={discoverHref}
                target="_blank"
                rel="noopener noreferrer"
                data-test-subj="contextListKiCapReachedDiscoverLink"
                {...getEbtProps({
                  element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageListKiPanel,
                  action: CONTEXT_ENGINE_UI_EBT.action.listKi.DISCOVER_CAP_REACHED,
                })}
              >
                <FormattedMessage
                  id="xpack.contextEngine.aiIndexDetail.listKi.capReachedDiscoverLink"
                  defaultMessage="Open in Discover"
                />
              </EuiLink>
            ),
          }}
        />
      ) : (
        i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.groupCapReached', {
          defaultMessage: 'Showing the first {count} of this type.',
          values: { count: MAX_KI_PAGE_SIZE },
        })
      )}
    </p>
  </EuiText>
);

export const ListKiGroup = ({
  group,
  isFirst,
  isCollapsed,
  onToggle,
  isKiSelected,
  onSelectKi,
  onHoverKi,
  onShowMore,
  discoverHref,
}: ListKiGroupProps) => {
  const styles = useListKiGroupsStyles();
  const headerId = useId();
  const { type, count, kis, canShowMore, isCapReached, isLoadingMore } = group;
  const typeLabel = getListKiTypeFilterLabel(type);

  return (
    <div role="group" aria-labelledby={headerId} data-test-subj={`contextListKiGroup-${type}`}>
      <button
        type="button"
        id={headerId}
        aria-expanded={!isCollapsed}
        css={[styles.groupHeader, isFirst && styles.firstGroupHeader]}
        onClick={() => onToggle(type)}
        data-test-subj="contextListKiGroupHeader"
      >
        <EuiIcon
          type={isCollapsed ? 'chevronSingleRight' : 'chevronSingleDown'}
          size="s"
          aria-hidden
        />
        <span css={[styles.groupName, kiLabelCapitalizeCss]}>{typeLabel}</span>
        <span css={styles.groupCount} data-test-subj="contextListKiGroupCount">
          {count}
        </span>
      </button>
      {isCollapsed ? null : (
        <>
          {kis.map((ki) => (
            <ListKiRow
              key={`${ki.index}:${ki.id}`}
              ki={ki}
              isSelected={isKiSelected(ki)}
              onSelect={onSelectKi}
              onHover={onHoverKi}
            />
          ))}
          {canShowMore || isCapReached ? (
            <div css={styles.groupFooter}>
              {canShowMore ? (
                <EuiButton
                  size="s"
                  isLoading={isLoadingMore}
                  onClick={() => onShowMore(type, kis.length)}
                  data-test-subj="contextListKiShowMoreButton"
                  {...getEbtProps({
                    element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageListKiPanel,
                    action: CONTEXT_ENGINE_UI_EBT.action.listKi.LOAD_MORE,
                  })}
                >
                  {i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.showMoreButton', {
                    defaultMessage: 'Show more',
                  })}
                </EuiButton>
              ) : (
                <CapReachedMessage discoverHref={discoverHref} />
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
};
