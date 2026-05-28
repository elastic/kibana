/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBetaBadge, EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { StreamsAppPageTemplate } from '../streams_app_page_template';

export const SignificantEventsView = () => {
  return (
    <>
      <StreamsAppPageTemplate.Header
        pageTitle={
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              {i18n.translate('xpack.streams.entityCentricLab.significantEvents.title', {
                defaultMessage: 'Significant events',
              })}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBetaBadge
                label={i18n.translate('xpack.streams.entityCentricLab.significantEvents.labBadge', {
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
            'xpack.streams.entityCentricLab.significantEvents.placeholderTitle',
            { defaultMessage: 'Placeholder page' }
          )}
          color="primary"
          iconType="info"
        >
          <EuiText size="s">
            <p>
              {i18n.translate('xpack.streams.entityCentricLab.significantEvents.placeholderBody', {
                defaultMessage:
                  'This is a prototype landing for significant events. Real content will live here once the experience is fleshed out.',
              })}
            </p>
          </EuiText>
        </EuiCallOut>
      </StreamsAppPageTemplate.Body>
    </>
  );
};
