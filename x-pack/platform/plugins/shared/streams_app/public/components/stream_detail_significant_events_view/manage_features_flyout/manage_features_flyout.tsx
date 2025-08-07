/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiLink,
  EuiLoadingSpinner,
  EuiText,
  EuiTextArea,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Streams } from '@kbn/streams-schema';
import React from 'react';
import { useKibana } from '../../../hooks/use_kibana';
import { useSignificantEventsApi } from '../../../hooks/use_significant_events_api';
import { useAIFeatures } from '../common/use_ai_features';

interface Props {
  definition: Streams.all.Definition;
  onClose: () => void;
  onSave: () => Promise<void>;
}

export function ManageFeaturesFlyout({ onClose, definition, onSave }: Props) {
  const {
    core: { notifications, http },
  } = useKibana();
  const aiFeatures = useAIFeatures();
  const { identifySystem } = useSignificantEventsApi({ name: definition.name });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [identifiedSystem, setIdentifiedSystem] = React.useState<string>();

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setIdentifiedSystem(e.target.value);
  };

  return (
    <EuiFlyout aria-labelledby="manageFeaturesFlyout" onClose={() => onClose()} size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>
            {i18n.translate('xpack.streams.streamDetailView.manageFeaturesFlyout.title', {
              defaultMessage: 'Manage identified system features',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexGroup direction="column" gutterSize="m">
            {aiFeatures.loading && <EuiLoadingSpinner size="m" />}

            {!aiFeatures.loading && !aiFeatures.enabled && (
              <EuiToolTip
                content={i18n.translate(
                  'xpack.streams.manageFeaturesFlyout.aiAssistantNotEnabledTooltip',
                  {
                    defaultMessage:
                      'AI Assistant features are not enabled. To enable features, add an AI connector on the management page.',
                  }
                )}
              >
                {aiFeatures.couldBeEnabled ? (
                  <EuiLink
                    target="_blank"
                    href={http.basePath.prepend(
                      `/app/management/insightsAndAlerting/triggersActionsConnectors/connectors`
                    )}
                  >
                    {i18n.translate('xpack.streams.manageFeaturesFlyout.aiAssistantNotEnabled', {
                      defaultMessage: 'Enable AI Assistant features',
                    })}
                  </EuiLink>
                ) : (
                  <EuiText>
                    <h3>
                      {i18n.translate(
                        'xpack.streams.addSignificantEventFlyout.aiAssistantNotEnabledAskAdmin',
                        { defaultMessage: 'Ask your administrator to enable AI Assistant features' }
                      )}
                    </h3>
                  </EuiText>
                )}
              </EuiToolTip>
            )}

            {!aiFeatures.loading && aiFeatures.enabled && (
              <>
                <EuiFlexGroup>
                  <EuiButton
                    isLoading={isGenerating}
                    disabled={
                      isSubmitting ||
                      isGenerating ||
                      !aiFeatures ||
                      !aiFeatures.enabled ||
                      !aiFeatures.selectedConnector
                    }
                    iconType="sparkles"
                    onClick={() => {
                      setIsGenerating(true);

                      const identifySystem$ = identifySystem(aiFeatures?.selectedConnector!);
                      identifySystem$.subscribe({
                        next: (result) => {
                          setIdentifiedSystem(result.feature);
                        },
                        error: (error) => {
                          notifications.showErrorDialog({
                            title: i18n.translate(
                              'xpack.streams.manageFeaturesFlyout.generateErrorToastTitle',
                              { defaultMessage: `Could not identify system features` }
                            ),
                            error,
                          });
                          setIsGenerating(false);
                        },
                        complete: () => {
                          notifications.toasts.addSuccess({
                            title: i18n.translate(
                              'xpack.streams.manageFeaturesFlyout.generateSuccessToastTitle',
                              { defaultMessage: `Successfully identified system features` }
                            ),
                          });
                          setIsGenerating(false);
                        },
                      });
                    }}
                  >
                    {isGenerating
                      ? i18n.translate('xpack.streams.manageFeaturesFlyout.detectingButtonLabel', {
                          defaultMessage: 'Detecting...',
                        })
                      : i18n.translate('xpack.streams.manageFeaturesFlyout.detectButtonLabel', {
                          defaultMessage: 'Detect',
                        })}
                  </EuiButton>
                </EuiFlexGroup>

                <EuiTextArea
                  fullWidth
                  disabled={isGenerating}
                  placeholder="Detected system features will appear here. You can edit them if needed."
                  aria-label="stream system features"
                  value={identifiedSystem}
                  onChange={(e) => onChange(e)}
                />
              </>
            )}
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" alignItems="center">
          <EuiButton color="text" onClick={() => onClose()} disabled={false}>
            {i18n.translate(
              'xpack.streams.streamDetailView.manageFeaturesFlyout.cancelButtonLabel',
              { defaultMessage: 'Cancel' }
            )}
          </EuiButton>
          <EuiButton color="primary" fill disabled={false} isLoading={false} onClick={() => {}}>
            {i18n.translate('xpack.streams.streamDetailView.manageFeaturesFlyout.saveButtonLabel', {
              defaultMessage: 'Save',
            })}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
