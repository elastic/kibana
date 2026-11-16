/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCard,
  EuiFlexGrid,
  EuiFlexItem,
  EuiIcon,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SourceType } from './types';
import { SOURCE_TYPE_CONFIGS } from './source_type_config';

interface AddSourceChooserModalProps {
  availableSourceTypes: SourceType[];
  onBrowseIntegrations: () => void;
  onUseIngestApi: () => void;
  onClose: () => void;
}

/**
 * POC stub of the north star "Add source" chooser: the entry point that either opens the
 * integrations catalogue (Elastic collects the data) or the existing source creation flow
 * (the user pushes the data to an ingest endpoint). Not a design-faithful build — it exists
 * so the handoff to the catalogue modal and the return path back here are real.
 */
export function AddSourceChooserModal({
  availableSourceTypes,
  onBrowseIntegrations,
  onUseIngestApi,
  onClose,
}: AddSourceChooserModalProps) {
  const titleId = useGeneratedHtmlId({ prefix: 'streamsAddSourceChooserTitle' });
  const ingestApiTypes = SOURCE_TYPE_CONFIGS.filter((config) =>
    availableSourceTypes.includes(config.type)
  );

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      maxWidth={720}
      data-test-subj="streamsAddSourceChooserModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle id={titleId}>
          {i18n.translate('xpack.streams.sources.addSourceChooser.title', {
            defaultMessage: 'Add source',
          })}
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s" color="subdued">
          {i18n.translate('xpack.streams.sources.addSourceChooser.description', {
            defaultMessage: 'How should the data reach this project?',
          })}
        </EuiText>
        <EuiSpacer size="m" />
        <EuiTitle size="xxs">
          <h3>
            {i18n.translate('xpack.streams.sources.addSourceChooser.elasticCollectsTitle', {
              defaultMessage: 'Elastic collects it',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiCard
          layout="horizontal"
          icon={<EuiIcon type="package" size="l" aria-hidden={true} />}
          title={i18n.translate('xpack.streams.sources.addSourceChooser.integrationTitle', {
            defaultMessage: 'Integration',
          })}
          description={i18n.translate(
            'xpack.streams.sources.addSourceChooser.integrationDescription',
            { defaultMessage: 'Browse integrations and let Elastic collect the data.' }
          )}
          onClick={onBrowseIntegrations}
          data-test-subj="streamsAddSourceChooserBrowseIntegrations"
        />
        <EuiSpacer size="l" />
        <EuiTitle size="xxs">
          <h3>
            {i18n.translate('xpack.streams.sources.addSourceChooser.youSendItTitle', {
              defaultMessage: 'You send it: Ingest APIs',
            })}
          </h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGrid columns={2} gutterSize="s">
          {ingestApiTypes.map((config) => (
            <EuiFlexItem key={config.type}>
              <EuiCard
                layout="horizontal"
                titleSize="xs"
                icon={<EuiIcon type="commandLine" size="m" aria-hidden={true} />}
                title={config.label}
                description={i18n.translate(
                  'xpack.streams.sources.addSourceChooser.ingestApiDescription',
                  { defaultMessage: 'Get the endpoint' }
                )}
                onClick={onUseIngestApi}
                data-test-subj={`streamsAddSourceChooserIngestApi-${config.type}`}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGrid>
      </EuiModalBody>
    </EuiModal>
  );
}
