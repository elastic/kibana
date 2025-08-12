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
import { useDescriptionGenerateApi } from '../../../hooks/use_description_generate_api';
import { useKibana } from '../../../hooks/use_kibana';
import { useAIFeatures } from '../common/use_ai_features';

interface Props {
  definition: Streams.all.Definition;
  onClose: () => void;
  onSave: (description: string) => Promise<void>;
}

export function ManageStreamDescriptionFlyout({ onClose, definition, onSave }: Props) {
  const {
    core: { notifications, http },
  } = useKibana();
  const aiFeatures = useAIFeatures();
  const generate = useDescriptionGenerateApi({ name: definition.name });
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [description, setDescription] = React.useState<string>(definition.description);

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
  };

  return (
    <EuiFlyout aria-labelledby="manageStreamDescription" onClose={() => onClose()} size="m">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2>
            {i18n.translate('xpack.streams.streamDetailView.manageStreamDescription.title', {
              defaultMessage: 'Manage stream description',
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
                  'xpack.streams.manageStreamDescription.aiAssistantNotEnabledTooltip',
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
                    {i18n.translate('xpack.streams.manageStreamDescription.aiAssistantNotEnabled', {
                      defaultMessage: 'Enable AI Assistant features',
                    })}
                  </EuiLink>
                ) : (
                  <EuiText>
                    <h3>
                      {i18n.translate(
                        'xpack.streams.manageStreamDescription.aiAssistantNotEnabledAskAdmin',
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

                      const generate$ = generate(aiFeatures?.selectedConnector!);
                      generate$.subscribe({
                        next: (result) => {
                          setDescription(result.description);
                        },
                        error: (error) => {
                          notifications.showErrorDialog({
                            title: i18n.translate(
                              'xpack.streams.manageStreamDescription.generateErrorToastTitle',
                              { defaultMessage: `Could not generate stream description` }
                            ),
                            error,
                          });
                          setIsGenerating(false);
                        },
                        complete: () => {
                          notifications.toasts.addSuccess({
                            title: i18n.translate(
                              'xpack.streams.manageStreamDescription.generateSuccessToastTitle',
                              { defaultMessage: `Successfully generated stream description` }
                            ),
                          });
                          setIsGenerating(false);
                        },
                      });
                    }}
                  >
                    {isGenerating
                      ? i18n.translate(
                          'xpack.streams.manageStreamDescription.generatingButtonLabel',
                          { defaultMessage: 'Generating...' }
                        )
                      : i18n.translate(
                          'xpack.streams.manageStreamDescription.generateButtonLabel',
                          { defaultMessage: 'Generate' }
                        )}
                  </EuiButton>
                </EuiFlexGroup>

                <EuiTextArea
                  fullWidth
                  disabled={isGenerating}
                  placeholder="The generated stream description will appear here. You can edit it if needed. This description is used to generate significant events definitions in your stream."
                  aria-label="stream description"
                  value={description}
                  onChange={(e) => onChange(e)}
                />
              </>
            )}
          </EuiFlexGroup>
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup gutterSize="s" justifyContent="spaceBetween" alignItems="center">
          <EuiButton color="text" onClick={() => onClose()} disabled={isSubmitting || isGenerating}>
            {i18n.translate(
              'xpack.streams.streamDetailView.manageStreamDescription.cancelButtonLabel',
              { defaultMessage: 'Cancel' }
            )}
          </EuiButton>
          <EuiButton
            color="primary"
            fill
            disabled={isSubmitting || isGenerating}
            isLoading={isSubmitting}
            onClick={() => {
              setIsSubmitting(true);
              onSave(description).finally(() => setIsSubmitting(false));
            }}
          >
            {i18n.translate(
              'xpack.streams.streamDetailView.manageStreamDescription.saveButtonLabel',
              {
                defaultMessage: 'Save',
              }
            )}
          </EuiButton>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
}
