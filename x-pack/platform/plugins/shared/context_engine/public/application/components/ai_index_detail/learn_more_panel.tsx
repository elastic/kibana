/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCard, EuiFlexGrid, EuiFlexItem, EuiIcon, EuiSpacer, EuiTitle } from '@elastic/eui';
import { getEbtProps } from '@kbn/ebt-click';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import { useKibana } from '../../hooks/use_kibana';

interface LearnMoreCard {
  id: string;
  iconType: string;
  title: string;
  description: string;
  href: string;
}

/** Links to the Context Engine docs. */
export const LearnMorePanel = () => {
  const {
    services: { docLinks },
  } = useKibana();
  const { aiIndices, sources, memory } = docLinks.links.contextEngine;

  const cards: LearnMoreCard[] = [
    {
      id: 'aiIndices',
      iconType: 'database',
      title: i18n.translate('xpack.contextEngine.aiIndexDetail.overview.learnMore.aiIndexTitle', {
        defaultMessage: 'What is an AI index',
      }),
      description: i18n.translate(
        'xpack.contextEngine.aiIndexDetail.overview.learnMore.aiIndexDescription',
        {
          defaultMessage:
            'How Context Engine turns your data into knowledge documents that agents retrieve.',
        }
      ),
      href: aiIndices,
    },
    {
      id: 'sources',
      iconType: 'plugs',
      title: i18n.translate('xpack.contextEngine.aiIndexDetail.overview.learnMore.sourcesTitle', {
        defaultMessage: 'Add sources',
      }),
      description: i18n.translate(
        'xpack.contextEngine.aiIndexDetail.overview.learnMore.sourcesDescription',
        {
          defaultMessage:
            'Point Context Engine at indices or connectors so it can write knowledge documents.',
        }
      ),
      href: sources,
    },
    {
      id: 'memory',
      iconType: 'bulb',
      title: i18n.translate('xpack.contextEngine.aiIndexDetail.overview.learnMore.memoryTitle', {
        defaultMessage: 'How memory works',
      }),
      description: i18n.translate(
        'xpack.contextEngine.aiIndexDetail.overview.learnMore.memoryDescription',
        { defaultMessage: 'What your agent saves, and who can see it.' }
      ),
      href: memory,
    },
  ];

  return (
    <section data-test-subj="contextOverviewLearnMore">
      <EuiTitle size="s">
        <h2>
          {i18n.translate('xpack.contextEngine.aiIndexDetail.overview.learnMore.title', {
            defaultMessage: 'Learn more',
          })}
        </h2>
      </EuiTitle>
      <EuiSpacer size="m" />
      <EuiFlexGrid columns={3} gutterSize="m">
        {cards.map(({ id, iconType, title, description, href }) => (
          <EuiFlexItem key={id}>
            <EuiCard
              layout="horizontal"
              icon={<EuiIcon type={iconType} size="l" color="primary" aria-hidden={true} />}
              title={title}
              titleSize="xs"
              titleElement="h3"
              description={description}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              hasBorder
              data-test-subj={`contextOverviewLearnMoreCard-${id}`}
              {...getEbtProps({
                element: CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageOverview,
                action: CONTEXT_ENGINE_UI_EBT.action.navigation.LEARN_MORE_DOCS,
                detail: id,
              })}
            />
          </EuiFlexItem>
        ))}
      </EuiFlexGrid>
    </section>
  );
};
