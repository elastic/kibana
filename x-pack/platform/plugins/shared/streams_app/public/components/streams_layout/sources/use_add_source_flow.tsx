/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback, useState } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { IntegrationCardItem } from '@kbn/ingest-hub-plugin/public';
import { useKibana } from '../../../hooks/use_kibana';
import { AddSourceChooserModal } from './add_source_chooser_modal';
import type { SourceType } from './types';

interface UseAddSourceFlowArgs {
  availableSourceTypes: SourceType[];
  /** Opens the existing ingest-API source creation modal. */
  openCreateModal: () => void;
  /** When false, the flow cannot be opened and renders nothing. */
  enabled?: boolean;
}

/**
 * POC (elastic/ingest-dev#10466): "Add source" opens a chooser; its Integration card opens the
 * integrations catalogue, which Ingest Hub composes out of Fleet's browse page, and the
 * catalogue's callout returns to the chooser's ingest-API half.
 *
 * Shared by the Sources tab and the Map, so both entry points behave the same.
 */
export function useAddSourceFlow({
  availableSourceTypes,
  openCreateModal,
  enabled = true,
}: UseAddSourceFlowArgs) {
  const {
    dependencies: {
      start: { ingestHub },
    },
    core: { notifications },
  } = useKibana();
  const [view, setView] = useState<'none' | 'chooser' | 'catalogue'>('none');
  const AddIntegrationModal = ingestHub?.AddIntegrationModal;

  const openAddSource = useCallback(() => setView('chooser'), []);
  const closeAddSource = useCallback(() => setView('none'), []);

  const onIntegrationSelected = useCallback(
    (card: IntegrationCardItem) => {
      setView('none');
      notifications.toasts.addInfo({
        title: i18n.translate('xpack.streams.sources.integrationSelectedToastTitle', {
          defaultMessage: 'Selected {title}',
          values: { title: card.title },
        }),
        text: i18n.translate('xpack.streams.sources.integrationSelectedToastText', {
          defaultMessage:
            'POC only: the onboarding wizard is not wired up, and no source was created.',
        }),
      });
    },
    [notifications.toasts]
  );

  const addSourceModals =
    !enabled || view === 'none' ? null : (
      <>
        {view === 'chooser' && (
          <AddSourceChooserModal
            availableSourceTypes={availableSourceTypes}
            onBrowseIntegrations={() => setView('catalogue')}
            onUseIngestApi={() => {
              setView('none');
              openCreateModal();
            }}
            onClose={closeAddSource}
          />
        )}
        {view === 'catalogue' && AddIntegrationModal && (
          <Suspense fallback={<EuiLoadingSpinner size="l" />}>
            <AddIntegrationModal
              onClose={closeAddSource}
              onIntegrationSelected={onIntegrationSelected}
              title={i18n.translate('xpack.streams.sources.addIntegrationModalTitle', {
                defaultMessage: 'Add data',
              })}
              subtitle={i18n.translate('xpack.streams.sources.addIntegrationModalSubtitle', {
                defaultMessage: 'Choose a technology to start collecting from',
              })}
              calloutAction={{
                text: i18n.translate('xpack.streams.sources.addIntegrationModalCalloutText', {
                  defaultMessage:
                    'Already sending with an OTel collector, Prometheus or Logstash? Send to an Ingest API instead.',
                }),
                label: i18n.translate('xpack.streams.sources.addIntegrationModalCalloutLabel', {
                  defaultMessage: 'Get an endpoint',
                }),
                onClick: () => setView('chooser'),
              }}
            />
          </Suspense>
        )}
      </>
    );

  return { openAddSource, closeAddSource, addSourceModals };
}
