/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiLink, EuiSkeletonText, EuiSpacer, EuiText } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ReactNode } from 'react';
import React from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../../common/telemetry';
import type { KiListItem } from '../../../../../common/http_api/knowledge_indicators';
import type { SelectedKi } from '../../../hooks/use_selected_ki';
import type { ListKiGroup } from './list_ki_groups_helpers';
import { ListKiGroups } from './list_ki_groups';
import { useListKiPanelStyles } from './list_ki_panel_styles';

interface ListKiBodyProps {
  aiIndexId: string;
  groups: ListKiGroup[];
  selectedKi?: SelectedKi;
  onSelectKi: (ki: KiListItem) => void;
  onShowMore: (type: string, loadedCount: number) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  isLoading: boolean;
  isRefetching?: boolean;
  error?: Error;
  discoverHref?: string;
  /** The viewer of the selected document, shown right of the list. */
  viewer?: ReactNode;
}

export const ListKiBody = ({
  aiIndexId,
  groups,
  selectedKi,
  onSelectKi,
  onShowMore,
  hasActiveFilters,
  onClearFilters,
  isLoading,
  isRefetching = false,
  error,
  discoverHref,
  viewer,
}: ListKiBodyProps) => {
  const styles = useListKiPanelStyles();

  if (isLoading && groups.length === 0) {
    return (
      <>
        <EuiSpacer size="m" />
        <EuiSkeletonText lines={4} data-test-subj="contextListKiLoading" />
      </>
    );
  }

  if (error) {
    return (
      <>
        <EuiSpacer size="m" />
        <EuiText size="s" color="danger" data-test-subj="contextListKiError">
          <p>
            {i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.error', {
              defaultMessage: 'Unable to load Knowledge documents.',
            })}
          </p>
        </EuiText>
      </>
    );
  }

  if (groups.length === 0 && hasActiveFilters) {
    return (
      <>
        <EuiSpacer size="m" />
        <EuiText size="s" color="subdued" data-test-subj="contextListKiNoResults">
          <p>
            <FormattedMessage
              id="xpack.contextEngine.aiIndexDetail.listKi.noResults"
              defaultMessage="Nothing matches these filters. {clearFiltersLink}"
              values={{
                clearFiltersLink: (
                  <EuiLink
                    onClick={onClearFilters}
                    data-test-subj="contextListKiClearFilters"
                    {...getEbtProps({
                      element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageListKiPanel,
                      action: CONTEXT_ENGINE_UI_EBT.action.aiIndexList.CLEAR_FILTERS,
                    })}
                  >
                    <FormattedMessage
                      id="xpack.contextEngine.aiIndexDetail.listKi.clearFilters"
                      defaultMessage="Clear filters"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
      </>
    );
  }

  if (groups.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="document"
        titleSize="xs"
        data-test-subj="contextListKiEmpty"
        title={
          <h3>
            {i18n.translate('xpack.contextEngine.aiIndexDetail.listKi.emptyTitle', {
              defaultMessage: 'No Knowledge documents found',
            })}
          </h3>
        }
      />
    );
  }

  return (
    <div css={styles.split} data-test-subj="contextListKiSplit">
      <ListKiGroups
        aiIndexId={aiIndexId}
        groups={groups}
        selectedKi={selectedKi}
        onSelectKi={onSelectKi}
        onShowMore={onShowMore}
        isRefetching={isRefetching}
        discoverHref={discoverHref}
        listCss={styles.list}
      />
      <div css={styles.viewerColumn} data-test-subj="contextListKiViewerColumn">
        {viewer}
      </div>
    </div>
  );
};
