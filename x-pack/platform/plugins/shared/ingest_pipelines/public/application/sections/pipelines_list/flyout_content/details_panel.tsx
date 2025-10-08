/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBetaBadge,
  EuiCodeBlock,
  EuiToolTip,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';

import type { Pipeline } from '../../../../../common/types';

import { deprecatedPipelineBadge } from '../table';
import { PipelineDetailsJsonBlock } from '../details_json_block';
import { stringifyJson } from '../../../lib/utils';

export interface Props {
  pipeline: Pipeline;
}

export const DetailsPanel: FunctionComponent<Props> = ({ pipeline }) => {
  return (
    <>
      <EuiTitle id="pipelineDetailsFlyoutTitle" data-test-subj="detailsPanelTitle">
        <h2>{pipeline.name}</h2>
      </EuiTitle>

      <EuiSpacer size="s" />

      <EuiFlexGroup alignItems="center" gutterSize="s" wrap responsive={false}>
        {/* Pipeline version */}
        {pipeline.version && (
          <EuiFlexItem grow={false}>
            <EuiText color="subdued" size="s">
              {i18n.translate('xpack.ingestPipelines.list.pipelineDetails.versionTitle', {
                defaultMessage: 'Version',
              })}{' '}
              {String(pipeline.version)}
            </EuiText>
          </EuiFlexItem>
        )}

        {/* Managed badge*/}
        {pipeline.isManaged && (
          <EuiFlexItem grow={false}>
            <EuiBetaBadge
              label={i18n.translate(
                'xpack.ingestPipelines.list.pipelineDetails.managedBadgeLabel',
                { defaultMessage: 'Managed' }
              )}
              size="s"
              color="hollow"
            />
          </EuiFlexItem>
        )}

        {/* Deprecated badge*/}
        {pipeline.deprecated && (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={deprecatedPipelineBadge.badgeTooltip}>
              <EuiBetaBadge
                label={deprecatedPipelineBadge.badge}
                size="s"
                color="subdued"
                data-test-subj="isDeprecatedBadge"
              />
            </EuiToolTip>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="m" />

      {/* Pipeline description */}
      {pipeline.description && (
        <>
          <EuiText size="s">{pipeline.description}</EuiText>
          <EuiSpacer size="m" />
        </>
      )}

      {/* Processors JSON */}
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('xpack.ingestPipelines.list.pipelineDetails.processorsTitle', {
            defaultMessage: 'Processors',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <PipelineDetailsJsonBlock json={pipeline.processors} />

      {/* On Failure Processor JSON */}
      {pipeline.on_failure?.length && (
        <>
          <EuiSpacer size="m" />
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('xpack.ingestPipelines.list.pipelineDetails.failureProcessorsTitle', {
                defaultMessage: 'Failure processors',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <PipelineDetailsJsonBlock json={pipeline.on_failure} />
        </>
      )}

      {/* Metadata (optional) */}
      {pipeline._meta && (
        <>
          <EuiSpacer size="m" />
          <EuiTitle size="xs" data-test-subj="metaTitle">
            <h3>
              <FormattedMessage
                id="xpack.ingestPipelines.list.pipelineDetails.metaDescriptionListTitle"
                defaultMessage="Metadata"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiCodeBlock language="json">{stringifyJson(pipeline._meta, false)}</EuiCodeBlock>
        </>
      )}
    </>
  );
};
