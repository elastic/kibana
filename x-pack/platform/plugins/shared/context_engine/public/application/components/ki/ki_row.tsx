/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiCodeBlock,
  EuiSkeletonText,
  EuiText,
  EuiTextBlockTruncate,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import type { GetKiResponse, KiListItem } from '../../../../common/http_api/knowledge_indicators';
import { useKi } from '../../hooks/use_ki';
import { getErrorMessage } from '../../utils/get_error_message';
import { getKiDisplayTitle, getKiDisplayTypeLabel } from './helpers';

interface KiRowProps {
  aiIndexId: string;
  ki: KiListItem;
}

const toKiJson = ({ id, document }: GetKiResponse): string =>
  JSON.stringify({ id, ...document }, null, 2);

const KiRowSource = ({
  aiIndexId,
  kiId,
  index,
}: {
  aiIndexId: string;
  kiId: string;
  index: string;
}) => {
  const { ki, isLoading, error } = useKi({ aiIndexId, kiId, index });

  if (isLoading) {
    return <EuiSkeletonText lines={6} data-test-subj="contextKiRowJsonLoading" />;
  }

  if (error) {
    return (
      <EuiText size="s" color="danger" data-test-subj="contextKiRowJsonError">
        <p>
          {i18n.translate('xpack.contextEngine.aiIndexDetail.kiList.rowJsonError', {
            defaultMessage: 'Unable to load Knowledge Indicator. {message}',
            values: { message: getErrorMessage(error) },
          })}
        </p>
      </EuiText>
    );
  }

  if (ki === undefined) {
    return null;
  }

  return (
    <EuiCodeBlock
      language="json"
      paddingSize="m"
      isCopyable
      overflowHeight={320}
      data-test-subj="contextKiRowJson"
    >
      {toKiJson(ki)}
    </EuiCodeBlock>
  );
};

export const KiRow = ({ aiIndexId, ki }: KiRowProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const title = getKiDisplayTitle(ki.title);
  const typeLabel = getKiDisplayTypeLabel(ki.type);

  return (
    <EuiAccordion
      id={`contextKiRow-${ki.index}-${ki.id}`}
      arrowDisplay="left"
      borders="none"
      paddingSize="s"
      data-test-subj="contextKiRow"
      buttonProps={{ 'data-test-subj': 'contextKiRowToggle' }}
      onToggle={setIsOpen}
      buttonContent={
        <div>
          <EuiTitle size="xxs">
            <EuiTextBlockTruncate lines={2} cloneElement>
              <span data-test-subj="contextKiRowTitle">{title}</span>
            </EuiTextBlockTruncate>
          </EuiTitle>
          <EuiText size="xs" color="subdued" data-test-subj="contextKiRowType">
            <p>{typeLabel}</p>
          </EuiText>
        </div>
      }
    >
      {isOpen ? <KiRowSource aiIndexId={aiIndexId} kiId={ki.id} index={ki.index} /> : null}
    </EuiAccordion>
  );
};
