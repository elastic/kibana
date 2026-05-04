/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiConfirmModal,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLoadingSpinner,
  EuiRadioGroup,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../hooks/use_kibana';
import { getFormattedError } from '../../../util/errors';

// TODO: import from @kbn/streams-plugin/server once workstream B types are public
type ScrapeIntervalSec = 15 | 30 | 60;

type PrometheusDestination =
  | { kind: 'cloudPipeline'; pipelineId: string }
  | { kind: 'bulkEndpoint' };

const DESTINATION_RADIO_ID_CLOUD_PIPELINE = 'cloudPipeline';
const DESTINATION_RADIO_ID_BULK_ENDPOINT = 'bulkEndpoint';

const SCRAPE_INTERVAL_OPTIONS: Array<{ value: string; text: string }> = [
  {
    value: '15',
    text: i18n.translate('xpack.streams.ingestFlow.prometheusScraperEditFlyout.scrapeInterval15s', {
      defaultMessage: '15s',
    }),
  },
  {
    value: '30',
    text: i18n.translate('xpack.streams.ingestFlow.prometheusScraperEditFlyout.scrapeInterval30s', {
      defaultMessage: '30s',
    }),
  },
  {
    value: '60',
    text: i18n.translate('xpack.streams.ingestFlow.prometheusScraperEditFlyout.scrapeInterval60s', {
      defaultMessage: '60s',
    }),
  },
];

export interface PrometheusScraperEditFlyoutProps {
  mode: 'create' | 'edit';
  scraperId?: string;
  onClose: () => void;
  /** Parent should trigger graph refresh */
  onSuccess: () => void;
}

export const PrometheusScraperEditFlyout: React.FC<PrometheusScraperEditFlyoutProps> = ({
  mode,
  scraperId,
  onClose,
  onSuccess,
}) => {
  const {
    core,
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const [name, setName] = useState('');
  const [targetHost, setTargetHost] = useState('');
  const [scrapeIntervalSec, setScrapeIntervalSec] = useState<ScrapeIntervalSec>(30);
  const [destinationKind, setDestinationKind] = useState<'cloudPipeline' | 'bulkEndpoint'>(
    'bulkEndpoint'
  );
  const [pipelineId, setPipelineId] = useState('');

  const [nameError, setNameError] = useState<string | undefined>();
  const [targetHostError, setTargetHostError] = useState<string | undefined>();
  const [pipelineIdError, setPipelineIdError] = useState<string | undefined>();
  const [submitError, setSubmitError] = useState<string | undefined>();

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(mode === 'edit');
  const [fetchError, setFetchError] = useState<string | undefined>();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'prometheusScraperEditFlyout' });

  // Fetch existing config for edit mode
  useEffect(() => {
    if (mode !== 'edit' || !scraperId) return;

    const abortController = new AbortController();

    const fetchScraper = async () => {
      setIsFetching(true);
      setFetchError(undefined);
      try {
        const scraper = await streamsRepositoryClient.fetch(
          'GET /internal/streams/_flow/prometheus_scrapers/{id}',
          {
            signal: abortController.signal,
            params: { path: { id: scraperId } },
          }
        );
        setName(scraper.name);
        setTargetHost(scraper.targetHost);
        setScrapeIntervalSec(scraper.scrapeIntervalSec);
        setDestinationKind(scraper.destination.kind);
        if (scraper.destination.kind === 'cloudPipeline') {
          setPipelineId(scraper.destination.pipelineId);
        }
      } catch (err) {
        if (!abortController.signal.aborted) {
          setFetchError(getFormattedError(err).message);
        }
      } finally {
        if (!abortController.signal.aborted) {
          setIsFetching(false);
        }
      }
    };

    fetchScraper();
    return () => abortController.abort();
  }, [mode, scraperId, streamsRepositoryClient]);

  const validate = useCallback((): boolean => {
    let valid = true;

    if (!name.trim()) {
      setNameError(
        i18n.translate('xpack.streams.ingestFlow.prometheusScraperEditFlyout.nameRequiredError', {
          defaultMessage: 'Name is required.',
        })
      );
      valid = false;
    } else {
      setNameError(undefined);
    }

    if (!targetHost.trim()) {
      setTargetHostError(
        i18n.translate(
          'xpack.streams.ingestFlow.prometheusScraperEditFlyout.targetHostRequiredError',
          { defaultMessage: 'Target host is required.' }
        )
      );
      valid = false;
    } else {
      setTargetHostError(undefined);
    }

    if (destinationKind === 'cloudPipeline' && !pipelineId.trim()) {
      setPipelineIdError(
        i18n.translate(
          'xpack.streams.ingestFlow.prometheusScraperEditFlyout.pipelineIdRequiredError',
          { defaultMessage: 'Pipeline ID is required when using Cloud Pipelines.' }
        )
      );
      valid = false;
    } else {
      setPipelineIdError(undefined);
    }

    return valid;
  }, [name, targetHost, destinationKind, pipelineId]);

  const buildDestination = useCallback((): PrometheusDestination => {
    if (destinationKind === 'cloudPipeline') {
      return { kind: 'cloudPipeline', pipelineId: pipelineId.trim() };
    }
    return { kind: 'bulkEndpoint' };
  }, [destinationKind, pipelineId]);

  const handleSave = useCallback(async () => {
    if (!validate()) return;

    setIsLoading(true);
    setSubmitError(undefined);

    try {
      const body = {
        name: name.trim(),
        targetHost: targetHost.trim(),
        scrapeIntervalSec,
        destination: buildDestination(),
      };

      if (mode === 'create') {
        await streamsRepositoryClient.fetch('POST /internal/streams/_flow/prometheus_scrapers', {
          params: { body },
        });
      } else {
        await streamsRepositoryClient.fetch(
          'PUT /internal/streams/_flow/prometheus_scrapers/{id}',
          {
            params: { path: { id: scraperId! }, body },
          }
        );
      }

      core.notifications.toasts.addSuccess(
        i18n.translate('xpack.streams.ingestFlow.prometheusScraperEditFlyout.savedSuccessToast', {
          defaultMessage: 'Scraper saved',
        })
      );
      onSuccess();
      onClose();
    } catch (err) {
      setSubmitError(getFormattedError(err).message);
    } finally {
      setIsLoading(false);
    }
  }, [
    validate,
    name,
    targetHost,
    scrapeIntervalSec,
    buildDestination,
    mode,
    scraperId,
    streamsRepositoryClient,
    core.notifications.toasts,
    onSuccess,
    onClose,
  ]);

  const handleDelete = useCallback(async () => {
    if (!scraperId) return;

    setIsDeleting(true);
    try {
      await streamsRepositoryClient.fetch(
        'DELETE /internal/streams/_flow/prometheus_scrapers/{id}',
        {
          params: { path: { id: scraperId } },
        }
      );
      core.notifications.toasts.addSuccess(
        i18n.translate('xpack.streams.ingestFlow.prometheusScraperEditFlyout.deletedSuccessToast', {
          defaultMessage: 'Scraper deleted',
        })
      );
      onSuccess();
      onClose();
    } catch (err) {
      core.notifications.toasts.addError(getFormattedError(err), {
        title: i18n.translate(
          'xpack.streams.ingestFlow.prometheusScraperEditFlyout.deleteErrorToastTitle',
          { defaultMessage: 'Failed to delete scraper' }
        ),
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [scraperId, streamsRepositoryClient, core.notifications.toasts, onSuccess, onClose]);

  const isEdit = mode === 'edit';
  const title = isEdit
    ? i18n.translate('xpack.streams.ingestFlow.prometheusScraperEditFlyout.editTitle', {
        defaultMessage: 'Edit Prometheus scraper',
      })
    : i18n.translate('xpack.streams.ingestFlow.prometheusScraperEditFlyout.createTitle', {
        defaultMessage: 'New Prometheus scraper',
      });

  const destinationRadioOptions = [
    {
      id: DESTINATION_RADIO_ID_CLOUD_PIPELINE,
      label: i18n.translate(
        'xpack.streams.ingestFlow.prometheusScraperEditFlyout.destinationCloudPipeline',
        { defaultMessage: 'Via Cloud Pipelines (OTLP)' }
      ),
    },
    {
      id: DESTINATION_RADIO_ID_BULK_ENDPOINT,
      label: i18n.translate(
        'xpack.streams.ingestFlow.prometheusScraperEditFlyout.destinationBulkEndpoint',
        { defaultMessage: 'Direct to Elasticsearch (_bulk)' }
      ),
    },
  ];

  return (
    <>
      <EuiFlyout onClose={onClose} size="s" ownFocus aria-labelledby={flyoutTitleId}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m" id={flyoutTitleId}>
            <h2>
              {title}{' '}
              <EuiBadge color="warning">
                {i18n.translate('xpack.streams.ingestFlow.prometheusScraperEditFlyout.mockBadge', {
                  defaultMessage: 'MOCK',
                })}
              </EuiBadge>
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>
          {isFetching ? (
            <EuiFlexGroup justifyContent="center" alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="l" />
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : fetchError ? (
            <EuiCallOut
              announceOnMount
              color="danger"
              iconType="error"
              title={i18n.translate(
                'xpack.streams.ingestFlow.prometheusScraperEditFlyout.fetchErrorTitle',
                { defaultMessage: 'Failed to load scraper' }
              )}
            >
              {fetchError}
            </EuiCallOut>
          ) : (
            <EuiForm component="form" fullWidth>
              {submitError && (
                <>
                  <EuiCallOut
                    announceOnMount
                    color="danger"
                    iconType="error"
                    title={i18n.translate(
                      'xpack.streams.ingestFlow.prometheusScraperEditFlyout.submitErrorTitle',
                      { defaultMessage: 'Save failed' }
                    )}
                  >
                    {submitError}
                  </EuiCallOut>
                  <EuiSpacer size="m" />
                </>
              )}

              <EuiFormRow
                label={i18n.translate(
                  'xpack.streams.ingestFlow.prometheusScraperEditFlyout.nameLabel',
                  { defaultMessage: 'Name' }
                )}
                isInvalid={!!nameError}
                error={nameError}
                fullWidth
              >
                <EuiFieldText
                  data-test-subj="streamsPrometheusScraperEditFlyoutName"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (nameError) setNameError(undefined);
                  }}
                  isInvalid={!!nameError}
                  fullWidth
                />
              </EuiFormRow>

              <EuiFormRow
                label={i18n.translate(
                  'xpack.streams.ingestFlow.prometheusScraperEditFlyout.targetHostLabel',
                  { defaultMessage: 'Target host' }
                )}
                isInvalid={!!targetHostError}
                error={targetHostError}
                fullWidth
              >
                <EuiFieldText
                  data-test-subj="streamsPrometheusScraperEditFlyoutTargetHost"
                  value={targetHost}
                  onChange={(e) => {
                    setTargetHost(e.target.value);
                    if (targetHostError) setTargetHostError(undefined);
                  }}
                  isInvalid={!!targetHostError}
                  placeholder={i18n.translate(
                    'xpack.streams.ingestFlow.prometheusScraperEditFlyout.targetHostPlaceholder',
                    { defaultMessage: 'prometheus.svc.cluster.local:9090' }
                  )}
                  fullWidth
                />
              </EuiFormRow>

              <EuiFormRow
                label={i18n.translate(
                  'xpack.streams.ingestFlow.prometheusScraperEditFlyout.scrapeIntervalLabel',
                  { defaultMessage: 'Scrape interval' }
                )}
                fullWidth
              >
                <EuiSelect
                  data-test-subj="streamsPrometheusScraperEditFlyoutScrapeInterval"
                  options={SCRAPE_INTERVAL_OPTIONS}
                  value={String(scrapeIntervalSec)}
                  onChange={(e) => {
                    setScrapeIntervalSec(Number(e.target.value) as ScrapeIntervalSec);
                  }}
                  fullWidth
                />
              </EuiFormRow>

              <EuiFormRow
                label={i18n.translate(
                  'xpack.streams.ingestFlow.prometheusScraperEditFlyout.destinationLabel',
                  { defaultMessage: 'Destination' }
                )}
                fullWidth
              >
                <EuiRadioGroup
                  data-test-subj="streamsPrometheusScraperEditFlyoutDestination"
                  options={destinationRadioOptions}
                  idSelected={destinationKind}
                  onChange={(id) => {
                    setDestinationKind(id as 'cloudPipeline' | 'bulkEndpoint');
                    if (id !== 'cloudPipeline') {
                      setPipelineIdError(undefined);
                    }
                  }}
                />
              </EuiFormRow>

              {destinationKind === DESTINATION_RADIO_ID_CLOUD_PIPELINE && (
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.streams.ingestFlow.prometheusScraperEditFlyout.pipelineIdLabel',
                    { defaultMessage: 'Pipeline ID' }
                  )}
                  isInvalid={!!pipelineIdError}
                  error={pipelineIdError}
                  fullWidth
                >
                  <EuiFieldText
                    data-test-subj="streamsPrometheusScraperEditFlyoutPipelineId"
                    value={pipelineId}
                    onChange={(e) => {
                      setPipelineId(e.target.value);
                      if (pipelineIdError) setPipelineIdError(undefined);
                    }}
                    isInvalid={!!pipelineIdError}
                    placeholder={i18n.translate(
                      'xpack.streams.ingestFlow.prometheusScraperEditFlyout.pipelineIdPlaceholder',
                      { defaultMessage: 'e.g. pipeline-abc123' }
                    )}
                    fullWidth
                  />
                </EuiFormRow>
              )}
            </EuiForm>
          )}
        </EuiFlyoutBody>

        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="streamsPrometheusScraperEditFlyoutCancel"
                    onClick={onClose}
                  >
                    {i18n.translate(
                      'xpack.streams.ingestFlow.prometheusScraperEditFlyout.cancelButton',
                      { defaultMessage: 'Cancel' }
                    )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                {isEdit && scraperId && (
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      data-test-subj="streamsPrometheusScraperEditFlyoutDelete"
                      color="danger"
                      onClick={() => setShowDeleteConfirm(true)}
                      isDisabled={isFetching || isDeleting}
                    >
                      {i18n.translate(
                        'xpack.streams.ingestFlow.prometheusScraperEditFlyout.deleteButton',
                        { defaultMessage: 'Delete' }
                      )}
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="streamsPrometheusScraperEditFlyoutSave"
                fill
                onClick={handleSave}
                isLoading={isLoading}
                isDisabled={isFetching || !!fetchError}
              >
                {i18n.translate('xpack.streams.ingestFlow.prometheusScraperEditFlyout.saveButton', {
                  defaultMessage: 'Save',
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>

      {showDeleteConfirm && (
        <EuiConfirmModal
          title={i18n.translate(
            'xpack.streams.ingestFlow.prometheusScraperEditFlyout.deleteConfirmTitle',
            { defaultMessage: 'Delete Prometheus scraper' }
          )}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          cancelButtonText={i18n.translate(
            'xpack.streams.ingestFlow.prometheusScraperEditFlyout.deleteConfirmCancel',
            { defaultMessage: 'Cancel' }
          )}
          confirmButtonText={i18n.translate(
            'xpack.streams.ingestFlow.prometheusScraperEditFlyout.deleteConfirmConfirm',
            { defaultMessage: 'Delete' }
          )}
          buttonColor="danger"
          isLoading={isDeleting}
        >
          {i18n.translate(
            'xpack.streams.ingestFlow.prometheusScraperEditFlyout.deleteConfirmBody',
            {
              defaultMessage:
                'Are you sure you want to delete this Prometheus scraper? This action cannot be undone.',
            }
          )}
        </EuiConfirmModal>
      )}
    </>
  );
};
