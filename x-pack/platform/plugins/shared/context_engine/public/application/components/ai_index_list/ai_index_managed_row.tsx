/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBadge,
  EuiBadgeGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiText,
  EuiTextBlockTruncate,
  EuiTitle,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { KI_SUMMARY_PAGE_SIZE } from '../../../../common/constants';
import type { AiIndexHttpItem } from '../../../../common/http_api/ai_indices';
import { useKiList } from '../../hooks/use_ki_list';
import { useNavigation } from '../../hooks/use_navigation';
import { getAiIndexDetailPath } from '../../paths';

interface AiIndexManagedRowProps {
  aiIndex: AiIndexHttpItem;
}

const getManagedIntegratedViaLabel = () =>
  i18n.translate('xpack.contextEngine.landing.managedRow.integratedVia.elastic', {
    defaultMessage: 'Elastic (built-in)',
  });

export const AiIndexManagedRow = ({ aiIndex }: AiIndexManagedRowProps) => {
  const { navigateToContextEngine } = useNavigation();
  const { summary, isLoading: isKiLoading } = useKiList({
    aiIndexId: aiIndex.id,
    size: KI_SUMMARY_PAGE_SIZE,
  });

  const viewDetailsLabel = i18n.translate('xpack.contextEngine.landing.managedRow.viewDetails', {
    defaultMessage: 'View AI index details for {name}',
    values: { name: aiIndex.id },
  });

  return (
    <EuiPanel
      hasBorder
      paddingSize="m"
      data-test-subj="contextAiIndexManagedRow"
      onClick={() => navigateToContextEngine(getAiIndexDetailPath(aiIndex.id))}
      aria-label={viewDetailsLabel}
    >
      <EuiFlexGroup alignItems="center" gutterSize="l" responsive={false}>
        <EuiFlexItem css={{ minWidth: 0 }}>
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xs">
                    <h3 data-test-subj="contextAiIndexManagedRowTitle">{aiIndex.id}</h3>
                  </EuiTitle>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadgeGroup gutterSize="s">
                    <EuiBadge
                      color="hollow"
                      iconType="lock"
                      data-test-subj="contextAiIndexManagedRowManaged"
                    >
                      <FormattedMessage
                        id="xpack.contextEngine.landing.managedRow.managed"
                        defaultMessage="Managed"
                      />
                    </EuiBadge>
                  </EuiBadgeGroup>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            {aiIndex.description !== undefined && (
              <EuiFlexItem grow={false}>
                <EuiText
                  size="s"
                  color="subdued"
                  data-test-subj="contextAiIndexManagedRowDescription"
                >
                  <EuiTextBlockTruncate lines={1}>{aiIndex.description}</EuiTextBlockTruncate>
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={false} css={{ width: 160 }}>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.contextEngine.landing.managedRow.knowledgeIndicatorsLabel"
              defaultMessage="Knowledge indicators"
            />
          </EuiText>
          <EuiText size="s" data-test-subj="contextAiIndexManagedRowKnowledgeIndicators">
            {isKiLoading ? '' : String(summary.total)}
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false} css={{ width: 160 }}>
          <EuiText size="xs" color="subdued">
            <FormattedMessage
              id="xpack.contextEngine.landing.managedRow.integratedViaLabel"
              defaultMessage="Integrated via"
            />
          </EuiText>
          <EuiText size="s" data-test-subj="contextAiIndexManagedRowIntegratedVia">
            {getManagedIntegratedViaLabel()}
          </EuiText>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiIcon
            type="chevronSingleRight"
            color="subdued"
            aria-hidden
            data-test-subj="contextAiIndexManagedRowActions"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
