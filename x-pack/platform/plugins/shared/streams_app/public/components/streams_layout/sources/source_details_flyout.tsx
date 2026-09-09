/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiDescriptionList,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedDate, FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { KbnDangerCallout } from '@kbn/ui-callout';
import type { SourceViewModel } from './types';
import { SOURCE_TYPE_CONFIG_BY_TYPE } from './source_type_config';
import { SourceSetupInstructions } from './source_setup_instructions';
import { RevealedApiKeyCallout } from './revealed_api_key_callout';
import type { SourcesController } from './sources_context';
import { DeleteSourcesConfirmation } from './delete_sources_confirmation';

interface SourceDetailsFlyoutProps {
  sources: Pick<
    SourcesController,
    | 'deleteSource'
    | 'generateApiKey'
    | 'deleteApiKey'
    | 'revealedApiKey'
    | 'apiKeyPrivileges'
    | 'apiKeyError'
    | 'isGeneratingApiKey'
    | 'isLoadingApiKeys'
  >;
  source: SourceViewModel;
  onClose: () => void;
}

export const SourceDetailsFlyout = ({ sources, source, onClose }: SourceDetailsFlyoutProps) => {
  const {
    deleteSource,
    generateApiKey,
    deleteApiKey,
    revealedApiKey,
    apiKeyPrivileges,
    apiKeyError,
    isGeneratingApiKey,
    isLoadingApiKeys,
  } = sources;
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [apiKeyPendingDeletion, setApiKeyPendingDeletion] = useState<string>();
  const sourceTypeConfig = SOURCE_TYPE_CONFIG_BY_TYPE[source.type];
  const sourceName = source.name?.trim() || source.id;
  const flyoutTitleId = useGeneratedHtmlId({ prefix: 'streamsSourceDetailsTitle' });
  const deleteApiKeyTitleId = useGeneratedHtmlId({ prefix: 'streamsDeleteApiKeyTitle' });
  const deleteApiKeyLabel = i18n.translate('xpack.streams.sources.deleteApiKeyAriaLabel', {
    defaultMessage: 'Delete API key',
  });

  const destinationLinks = useMemo(
    () =>
      source.destinations.length > 0
        ? source.destinations.map((destination) => ({
            title: destination,
            description: i18n.translate('xpack.streams.sources.destinationLinkDescription', {
              defaultMessage: 'Destination',
            }),
          }))
        : [
            {
              title: i18n.translate('xpack.streams.sources.noDestinationsTitle', {
                defaultMessage: 'No destinations connected',
              }),
              description: i18n.translate('xpack.streams.sources.noDestinationsDescription', {
                defaultMessage: 'Connect this source from the canvas to route data.',
              }),
            },
          ],
    [source.destinations]
  );

  return (
    <>
      <EuiFlyout
        ownFocus
        aria-labelledby={flyoutTitleId}
        onClose={onClose}
        size="s"
        data-test-subj="streamsSourceDetailsFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="s">
            <h2 id={flyoutTitleId}>{sourceName}</h2>
          </EuiTitle>
          <EuiText size="s" color="subdued">
            {sourceTypeConfig.label}
          </EuiText>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiTitle size="xxs">
            <h3>
              {i18n.translate('xpack.streams.sources.destinationsTitle', {
                defaultMessage: 'Destinations',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiDescriptionList compressed listItems={destinationLinks} />
          <EuiSpacer size="m" />
          <SourceSetupInstructions
            source={source}
            apiKey={revealedApiKey?.encoded}
            showEndpointHelpText={false}
          />
          <EuiSpacer size="m" />
          {apiKeyError && (
            <>
              <KbnDangerCallout
                announceOnMount
                title={i18n.translate('xpack.streams.sources.apiKeyOperationFailedTitle', {
                  defaultMessage: 'Could not update API keys',
                })}
                text={apiKeyError}
              />
              <EuiSpacer size="m" />
            </>
          )}
          {revealedApiKey && (
            <>
              <RevealedApiKeyCallout apiKey={revealedApiKey.encoded} />
              <EuiSpacer size="m" />
            </>
          )}
          <EuiTitle size="xxs">
            <h3>
              {i18n.translate('xpack.streams.sources.apiKeysTitle', {
                defaultMessage: 'API key',
              })}
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          {isLoadingApiKeys ? (
            <EuiLoadingSpinner
              size="m"
              aria-label={i18n.translate('xpack.streams.sources.loadingApiKeysLabel', {
                defaultMessage: 'Loading API keys',
              })}
            />
          ) : source.apiKeys.length === 0 ? (
            <EuiText size="s" color="subdued">
              {i18n.translate('xpack.streams.sources.noApiKeysDescription', {
                defaultMessage: 'No API keys have been generated for this source.',
              })}
            </EuiText>
          ) : (
            <EuiFlexGroup direction="column" gutterSize="s">
              {source.apiKeys.map((apiKey) => (
                <EuiFlexItem key={apiKey.id}>
                  <EuiPanel hasShadow={false} hasBorder paddingSize="s">
                    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiIcon type="key" color="subdued" aria-hidden={true} />
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiText size="xs" color="subdued">
                          <FormattedMessage
                            id="xpack.streams.sources.apiKeyCreatedLabel"
                            defaultMessage="Key generated on {createdAt}"
                            values={{
                              createdAt: (
                                <FormattedDate
                                  value={new Date(apiKey.createdAt)}
                                  month="short"
                                  day="2-digit"
                                  year="numeric"
                                />
                              ),
                            }}
                          />
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty
                          color="danger"
                          flush="right"
                          size="xs"
                          aria-label={deleteApiKeyLabel}
                          onClick={() => setApiKeyPendingDeletion(apiKey.id)}
                        >
                          {i18n.translate('xpack.streams.sources.deleteApiKeyButtonLabel', {
                            defaultMessage: 'Delete',
                          })}
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          )}
          <EuiSpacer size="s" />
          <EuiButton
            size="s"
            isLoading={isGeneratingApiKey || isLoadingApiKeys}
            isDisabled={!source.endpoint || apiKeyPrivileges?.canCreate === false}
            onClick={() => generateApiKey(source.id)}
            data-test-subj="streamsSourceGenerateApiKeyButton"
          >
            {i18n.translate('xpack.streams.sources.generateKeyButtonLabel', {
              defaultMessage: 'Generate key',
            })}
          </EuiButton>
          {apiKeyPrivileges && !apiKeyPrivileges.canCreate && (
            <>
              <EuiSpacer size="s" />
              <EuiText size="s" color="subdued" data-test-subj="streamsSourceApiKeyPrivilegeHint">
                {apiKeyPrivileges.failure === 'cluster'
                  ? i18n.translate('xpack.streams.sources.missingApiKeyClusterPrivilegeHint', {
                      defaultMessage: "Your account can't create API keys.",
                    })
                  : i18n.translate('xpack.streams.sources.missingIngestSourcePrivilegeHint', {
                      defaultMessage:
                        "Your account can't create ingest keys. Ask an admin for the ingest_source_manager role.",
                    })}
              </EuiText>
            </>
          )}
          <EuiHorizontalRule />
          <EuiText size="xs" color="danger">
            <strong>
              {i18n.translate('xpack.streams.sources.dangerAreaLabel', {
                defaultMessage: 'Danger area',
              })}
            </strong>
          </EuiText>
          <EuiSpacer size="s" />
          <EuiButton
            color="danger"
            fill
            size="s"
            onClick={() => setIsConfirmingDelete(true)}
            data-test-subj="streamsSourceDeleteButton"
          >
            {i18n.translate('xpack.streams.sources.deleteSourceButtonLabel', {
              defaultMessage: 'Delete source',
            })}
          </EuiButton>
        </EuiFlyoutBody>
      </EuiFlyout>
      {isConfirmingDelete && (
        <DeleteSourcesConfirmation
          count={1}
          onCancel={() => setIsConfirmingDelete(false)}
          onConfirm={() => {
            deleteSource(source.id);
            setIsConfirmingDelete(false);
            onClose();
          }}
        />
      )}
      {apiKeyPendingDeletion && (
        <EuiConfirmModal
          aria-labelledby={deleteApiKeyTitleId}
          title={i18n.translate('xpack.streams.sources.deleteApiKeyConfirmTitle', {
            defaultMessage: 'Delete API key?',
          })}
          titleProps={{ id: deleteApiKeyTitleId }}
          onCancel={() => setApiKeyPendingDeletion(undefined)}
          onConfirm={() => {
            deleteApiKey(source.id, apiKeyPendingDeletion);
            setApiKeyPendingDeletion(undefined);
          }}
          cancelButtonText={i18n.translate('xpack.streams.sources.deleteCancelButtonLabel', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate(
            'xpack.streams.sources.deleteApiKeyConfirmButtonLabel',
            {
              defaultMessage: 'Delete API key',
            }
          )}
          buttonColor="danger"
          defaultFocusedButton="confirm"
          data-test-subj="streamsDeleteApiKeyConfirmation"
        >
          <p>
            {i18n.translate('xpack.streams.sources.deleteApiKeyConfirmDescription', {
              defaultMessage: 'Applications using this key will no longer be able to send data.',
            })}
          </p>
        </EuiConfirmModal>
      )}
    </>
  );
};
