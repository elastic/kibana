/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { StreamsAppPageTemplate } from '../../streams_app_page_template';
import { useStreamsAppParams } from '../../../hooks/use_streams_app_params';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { isKnownCategoryId } from './fake_entities';
import { isKnownCloudProviderId, isKnownCloudServiceId } from './cloud_providers';
import { AllEntitiesView } from './all_entities_view';

/**
 * Thin wrapper for the `/entities/{category}` route. Reads the category
 * segment from the URL, narrows it to the canonical `EntityCategoryId`
 * via {@link isKnownCategoryId}, and hands it off to {@link AllEntitiesView}
 * as a `categoryScope`. The scoped view reuses the entire All entities UI
 * (search, tag filters, grid vs list, flyout) — only the dataset and the
 * page header change.
 *
 * Unknown segments (typos, stale bookmarks) fall back to a small empty
 * prompt that links back to All entities, rather than rendering the page
 * with an empty grid.
 */
export const CategoryEntitiesView = () => {
  const {
    path: { category: rawCategory },
  } = useStreamsAppParams('/entities/{category}');

  if (isKnownCategoryId(rawCategory)) {
    return <AllEntitiesView categoryScope={rawCategory} />;
  }

  return <UnknownEntitiesScope label={rawCategory} />;
};

/**
 * Wrapper for `/entities/cloud/{provider}`. Validates the provider
 * segment against {@link CLOUD_PROVIDERS} and renders the cloud page
 * scoped to that provider (AWS / GCP / Azure).
 */
export const CloudProviderView = () => {
  const {
    path: { provider: rawProvider },
  } = useStreamsAppParams('/entities/cloud/{provider}');

  if (isKnownCloudProviderId(rawProvider)) {
    return <AllEntitiesView categoryScope="cloud" cloudProviderScope={rawProvider} />;
  }

  return <UnknownEntitiesScope label={rawProvider} />;
};

/**
 * Wrapper for `/entities/cloud/{provider}/{service}`. Validates both
 * segments and renders the cloud page scoped to a single service
 * (e.g. AWS / EC2).
 */
export const CloudServiceView = () => {
  const {
    path: { provider: rawProvider, service: rawService },
  } = useStreamsAppParams('/entities/cloud/{provider}/{service}');

  if (isKnownCloudProviderId(rawProvider) && isKnownCloudServiceId(rawProvider, rawService)) {
    return (
      <AllEntitiesView
        categoryScope="cloud"
        cloudProviderScope={rawProvider}
        cloudServiceScope={rawService}
      />
    );
  }

  return <UnknownEntitiesScope label={`${rawProvider}/${rawService}`} />;
};

/**
 * Shared empty prompt for any unknown category / provider / service
 * segment (typos, stale bookmarks) — links back to All entities rather
 * than rendering an empty grid.
 */
const UnknownEntitiesScope = ({ label }: { label: string }) => {
  const router = useStreamsAppRouter();
  return (
    <>
      <StreamsAppPageTemplate.Header
        pageTitle={i18n.translate('xpack.streams.entityCentricLab.entities.category.unknownTitle', {
          defaultMessage: 'Unknown category',
        })}
      />
      <StreamsAppPageTemplate.Body>
        <EuiEmptyPrompt
          iconType="questionInCircle"
          title={
            <h2>
              {i18n.translate(
                'xpack.streams.entityCentricLab.entities.category.unknownPromptTitle',
                {
                  defaultMessage: 'We don\u2019t know about "{category}"',
                  values: { category: label },
                }
              )}
            </h2>
          }
          body={
            <p>
              {i18n.translate(
                'xpack.streams.entityCentricLab.entities.category.unknownPromptBody',
                {
                  defaultMessage:
                    'This category isn\u2019t part of the entity-centric lab. Head back to All entities to see the full picture.',
                }
              )}
            </p>
          }
          actions={
            <EuiButtonEmpty
              iconType="arrowLeft"
              onClick={() => {
                router.push('/entities', { path: {}, query: {} });
              }}
              data-test-subj="entityCentricLabCategoryBackToAll"
            >
              {i18n.translate('xpack.streams.entityCentricLab.entities.category.backToAll', {
                defaultMessage: 'Back to All entities',
              })}
            </EuiButtonEmpty>
          }
        />
      </StreamsAppPageTemplate.Body>
    </>
  );
};
