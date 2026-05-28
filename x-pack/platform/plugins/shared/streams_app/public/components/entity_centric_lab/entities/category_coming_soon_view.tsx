/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBetaBadge,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { StreamsAppPageTemplate } from '../../streams_app_page_template';
import { useStreamsAppParams } from '../../../hooks/use_streams_app_params';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import type { EntityCategoryId } from './fake_entities';
import { getCategoryDescriptor } from './fake_entities';

const KNOWN_CATEGORIES: ReadonlyArray<EntityCategoryId> = [
  'hosts',
  'kubernetes',
  'databases',
  'services',
  'cloud',
  'middlewares',
  'llms',
];

const isKnownCategory = (value: string): value is EntityCategoryId =>
  (KNOWN_CATEGORIES as readonly string[]).includes(value);

export const CategoryComingSoonView = () => {
  const router = useStreamsAppRouter();
  const {
    path: { category: rawCategory },
  } = useStreamsAppParams('/entities/{category}');

  const descriptor = isKnownCategory(rawCategory) ? getCategoryDescriptor(rawCategory) : undefined;
  const label = descriptor?.label ?? rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1);

  return (
    <>
      <StreamsAppPageTemplate.Header
        pageTitle={
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            {descriptor?.icon ? (
              <EuiFlexItem grow={false}>
                <EuiIcon type={descriptor.icon} size="l" aria-hidden />
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow={false}>{label}</EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBetaBadge
                label={i18n.translate('xpack.streams.entityCentricLab.entities.category.labBadge', {
                  defaultMessage: 'Lab',
                })}
                size="s"
                color="hollow"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      />
      <StreamsAppPageTemplate.Body>
        <EuiCallOut
          title={i18n.translate(
            'xpack.streams.entityCentricLab.entities.category.comingSoonTitle',
            { defaultMessage: 'Coming soon' }
          )}
          color="primary"
          iconType="info"
        >
          <EuiText size="s">
            <p>
              {i18n.translate('xpack.streams.entityCentricLab.entities.category.comingSoonBody', {
                defaultMessage:
                  'The {label} category page is still being designed. While we work on it, see the full picture in All entities.',
                values: { label },
              })}
            </p>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiButtonEmpty
            iconType="arrowLeft"
            flush="left"
            onClick={() => {
              router.push('/entities', { path: {}, query: {} });
            }}
            data-test-subj="entityCentricLabCategoryBackToAll"
          >
            {i18n.translate('xpack.streams.entityCentricLab.entities.category.backToAll', {
              defaultMessage: 'Back to All entities',
            })}
          </EuiButtonEmpty>
        </EuiCallOut>
      </StreamsAppPageTemplate.Body>
    </>
  );
};
