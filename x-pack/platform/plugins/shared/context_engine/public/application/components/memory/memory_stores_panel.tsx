/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiDescriptionList, EuiLink, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { MouseEvent } from 'react';
import React from 'react';
import {
  LONG_TERM_MEMORY_AI_INDEX_ID,
  MAX_SHORT_TERM_MEMORY_EXPIRATION_DAYS,
  SHORT_TERM_MEMORY_AI_INDEX_ID,
} from '../../../../common/memory';
import { useNavigation } from '../../hooks/use_navigation';
import { getAiIndexKnowledgeIndicatorsPath } from '../../paths';

const STORES = [
  {
    id: SHORT_TERM_MEMORY_AI_INDEX_ID,
    label: i18n.translate('xpack.contextEngine.memory.stores.shortTerm.label', {
      defaultMessage: 'Short-term memory',
    }),
    description: i18n.translate('xpack.contextEngine.memory.stores.shortTerm.description', {
      defaultMessage:
        'Memories agents save during conversations. They expire after at most {days} days.',
      values: { days: MAX_SHORT_TERM_MEMORY_EXPIRATION_DAYS },
    }),
  },
  {
    id: LONG_TERM_MEMORY_AI_INDEX_ID,
    label: i18n.translate('xpack.contextEngine.memory.stores.longTerm.label', {
      defaultMessage: 'Long-term memory',
    }),
    description: i18n.translate('xpack.contextEngine.memory.stores.longTerm.description', {
      defaultMessage:
        'Facts and other lasting memories that dreaming distills from short-term memory.',
    }),
  },
] as const;

export const MemoryStoresPanel = () => {
  const { createContextEngineUrl, navigateToContextEngine } = useNavigation();

  return (
    <EuiPanel hasBorder paddingSize="l" data-test-subj="contextMemoryStoresPanel">
      <EuiTitle size="s">
        <h2>
          <FormattedMessage id="xpack.contextEngine.memory.stores.title" defaultMessage="Stores" />
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiDescriptionList
        listItems={STORES.map(({ id, label, description }) => {
          const path = getAiIndexKnowledgeIndicatorsPath(id);
          return {
            title: (
              <EuiLink
                href={createContextEngineUrl(path)}
                onClick={(event: MouseEvent) => {
                  event.preventDefault();
                  navigateToContextEngine(path);
                }}
                data-test-subj={`contextMemoryStoreLink-${id}`}
              >
                {label}
              </EuiLink>
            ),
            description,
          };
        })}
      />
    </EuiPanel>
  );
};
