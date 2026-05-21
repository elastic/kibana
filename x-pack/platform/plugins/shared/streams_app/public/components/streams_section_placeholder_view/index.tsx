/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { StreamsAppPageTemplate } from '../streams_app_page_template';

interface StreamsSectionPlaceholderViewProps {
  pageTitle: string;
  description: string;
  testSubj: string;
}

export const StreamsSectionPlaceholderView: React.FC<StreamsSectionPlaceholderViewProps> = ({
  pageTitle,
  description,
  testSubj,
}) => (
  <>
    <StreamsAppPageTemplate.Header
      pageTitle={pageTitle}
      bottomBorder="extended"
      data-test-subj={`${testSubj}Header`}
    />
    <StreamsAppPageTemplate.Body>
      <EuiEmptyPrompt
        data-test-subj={testSubj}
        title={<h2>{pageTitle}</h2>}
        body={
          <EuiText color="subdued" size="s">
            <p>{description}</p>
          </EuiText>
        }
      />
    </StreamsAppPageTemplate.Body>
  </>
);

export const ContentPacksView: React.FC = () => (
  <StreamsSectionPlaceholderView
    pageTitle={i18n.translate('xpack.streams.contentPacksView.pageTitle', {
      defaultMessage: 'Content Packs',
    })}
    description={i18n.translate('xpack.streams.contentPacksView.description', {
      defaultMessage: 'Import and export stream content packs from this area.',
    })}
    testSubj="streamsContentPacksView"
  />
);

export const PipelinesView: React.FC = () => (
  <StreamsSectionPlaceholderView
    pageTitle={i18n.translate('xpack.streams.pipelinesView.pageTitle', {
      defaultMessage: 'Pipelines',
    })}
    description={i18n.translate('xpack.streams.pipelinesView.description', {
      defaultMessage: 'Manage ingest pipelines connected to your streams from this area.',
    })}
    testSubj="streamsPipelinesView"
  />
);
