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
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBetaBadge,
  EuiCodeBlock,
  EuiToolTip,
  EuiText,
  EuiSpacer,
  EuiSplitPanel,
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
    <EuiSplitPanel.Inner style={{ overflowY: 'auto' }}>
      <EuiTitle id="pipelineDetailsFlyoutTitle" data-test-subj="detailsPanelTitle">
        <h2>{pipeline.name}</h2>
      </EuiTitle>

      <EuiSpacer size="s" />

      <EuiFlexGroup alignItems="center" gutterSize="m">
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
                tabIndex={0}
              />
            </EuiToolTip>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiDescriptionList rowGutterSize="m">
        {/* Pipeline description */}
        {pipeline.description && (
          <>
            <EuiDescriptionListTitle />
            <EuiDescriptionListDescription>{pipeline.description}</EuiDescriptionListDescription>
          </>
        )}

        {/* Processors JSON */}
        <EuiDescriptionListTitle>
          {i18n.translate('xpack.ingestPipelines.list.pipelineDetails.processorsTitle', {
            defaultMessage: 'Processors',
          })}
        </EuiDescriptionListTitle>
        <EuiDescriptionListDescription>
          <PipelineDetailsJsonBlock json={pipeline.processors} />
        </EuiDescriptionListDescription>

        {/* On Failure Processor JSON */}
        {pipeline.on_failure?.length && (
          <>
            <EuiDescriptionListTitle>
              {i18n.translate('xpack.ingestPipelines.list.pipelineDetails.failureProcessorsTitle', {
                defaultMessage: 'Failure processors',
              })}
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              <PipelineDetailsJsonBlock json={pipeline.on_failure} />
            </EuiDescriptionListDescription>
          </>
        )}

        {/* Metadata (optional) */}
        {pipeline._meta && (
          <>
            <EuiDescriptionListTitle data-test-subj="metaTitle">
              <FormattedMessage
                id="xpack.ingestPipelines.list.pipelineDetails.metaDescriptionListTitle"
                defaultMessage="Metadata"
              />
            </EuiDescriptionListTitle>
            <EuiDescriptionListDescription>
              <EuiCodeBlock language="json">{stringifyJson(pipeline._meta, false)}</EuiCodeBlock>
            </EuiDescriptionListDescription>
          </>
        )}
      </EuiDescriptionList>
    </EuiSplitPanel.Inner>
  );
};
