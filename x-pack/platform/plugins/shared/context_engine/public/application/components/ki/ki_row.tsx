/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiText, EuiTextBlockTruncate, EuiTitle } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import type { KiListItem } from '../../../../common/http_api/knowledge_indicators';
import { useNavigation } from '../../hooks/use_navigation';
import { getViewKiPath } from '../../paths';
import { getKiDisplayTitle, getKiDisplayTypeLabel } from './helpers';

interface KiRowProps {
  aiIndexId: string;
  ki: KiListItem;
}

export const KiRow = ({ aiIndexId, ki }: KiRowProps) => {
  const { navigateToContextEngine } = useNavigation();
  const title = getKiDisplayTitle(ki.title);
  const typeLabel = getKiDisplayTypeLabel(ki.type);

  const handleClick = useCallback(() => {
    navigateToContextEngine(getViewKiPath(aiIndexId, ki.id), { index: ki.index });
  }, [aiIndexId, ki.id, ki.index, navigateToContextEngine]);

  const ariaLabel = i18n.translate('xpack.contextEngine.aiIndexDetail.kiList.viewRowAriaLabel', {
    defaultMessage: 'View Knowledge Indicator {title}',
    values: { title },
  });

  return (
    <EuiPanel
      paddingSize="s"
      hasShadow={false}
      hasBorder={false}
      onClick={handleClick}
      data-test-subj="contextKiRow"
      aria-label={ariaLabel}
      css={{ cursor: 'pointer', textAlign: 'left', width: '100%' }}
      {...getEbtProps({
        element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageKiListPanel,
        action: CONTEXT_ENGINE_UI_EBT.action.kiList.OPEN_ROW,
      })}
    >
      <EuiTitle size="xxs">
        <EuiTextBlockTruncate lines={2} cloneElement>
          <span data-test-subj="contextKiRowTitle">{title}</span>
        </EuiTextBlockTruncate>
      </EuiTitle>
      <EuiText size="xs" color="subdued" data-test-subj="contextKiRowType">
        <p>{typeLabel}</p>
      </EuiText>
    </EuiPanel>
  );
};
