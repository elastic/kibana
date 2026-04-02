/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBottomBar,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextArea,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MANAGEMENT_APP_LOCATOR } from '@kbn/deeplinks-management/constants';
import { OBSERVABILITY_STREAMS_SIG_EVENTS_INDEX_PATTERNS } from '@kbn/management-settings-ids';
import { DEFAULT_INDEX_PATTERNS } from '@kbn/streams-schema';
import { useKibana } from '../../../../../hooks/use_kibana';

export function SettingsTab() {
  const {
    dependencies: {
      start: { share },
    },
    core,
  } = useKibana();

  const modelSettingsUrl = useMemo(() => {
    const managementLocator = share.url.locators.get(MANAGEMENT_APP_LOCATOR);
    return managementLocator?.getRedirectUrl({ sectionId: 'ml', appId: 'model_settings' }) ?? '';
  }, [share.url.locators]);

  const [savedIndexPatterns, setSavedIndexPatterns] = useState<string>(() =>
    core.settings.client.get<string>(
      OBSERVABILITY_STREAMS_SIG_EVENTS_INDEX_PATTERNS,
      DEFAULT_INDEX_PATTERNS
    )
  );
  const [indexPatterns, setIndexPatterns] = useState<string>(savedIndexPatterns);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<Error | null>(null);

  const hasChanges = indexPatterns !== savedIndexPatterns;

  const handleCancel = useCallback(() => {
    setIndexPatterns(savedIndexPatterns);
    setSaveError(null);
  }, [savedIndexPatterns]);

  const handleSave = useCallback(async () => {
    setSaveError(null);
    setIsSaving(true);
    try {
      await core.settings.client.set(
        OBSERVABILITY_STREAMS_SIG_EVENTS_INDEX_PATTERNS,
        indexPatterns
      );
      setSavedIndexPatterns(indexPatterns);
    } catch (err) {
      setSaveError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsSaving(false);
    }
  }, [core.settings.client, indexPatterns]);

  return (
    <>
      <EuiPanel hasBorder={true} hasShadow={false} paddingSize="none" grow={false}>
        <EuiPanel hasShadow={false} color="subdued">
          <EuiText size="s">
            <h3>
              {i18n.translate('xpack.streams.significantEventsDiscovery.settings.llmSectionTitle', {
                defaultMessage: 'LLM selection',
              })}
            </h3>
          </EuiText>
        </EuiPanel>
        <EuiPanel hasShadow={false} hasBorder={false}>
          <EuiText size="s">
            <p>
              {i18n.translate(
                'xpack.streams.significantEventsDiscovery.settings.modelSettingsDescription',
                {
                  defaultMessage:
                    'LLM models for Significant Events features are managed centrally in the Model Settings page under Stack Management.',
                }
              )}
            </p>
          </EuiText>
          {modelSettingsUrl && (
            <>
              <EuiSpacer size="s" />
              <EuiLink href={modelSettingsUrl} external>
                {i18n.translate(
                  'xpack.streams.significantEventsDiscovery.settings.modelSettingsLink',
                  { defaultMessage: 'Go to Model Settings' }
                )}
              </EuiLink>
            </>
          )}
        </EuiPanel>
      </EuiPanel>

      <EuiSpacer />

      <EuiPanel hasBorder={true} hasShadow={false} paddingSize="none" grow={false}>
        <EuiPanel hasShadow={false} color="subdued">
          <EuiText size="s">
            <h3>
              {i18n.translate(
                'xpack.streams.significantEventsDiscovery.settings.dataSourcesSectionTitle',
                { defaultMessage: 'Data sources' }
              )}
            </h3>
          </EuiText>
        </EuiPanel>
        <EuiPanel hasShadow={false} hasBorder={false}>
          <EuiFlexGroup alignItems="flexStart" gutterSize="l">
            <EuiFlexItem grow={2}>
              <EuiFlexGroup direction="column" gutterSize="xs">
                <EuiFlexItem>
                  <EuiText size="m">
                    <h4>
                      {i18n.translate(
                        'xpack.streams.significantEventsDiscovery.settings.indexPatternsLabel',
                        { defaultMessage: 'Index patterns' }
                      )}
                    </h4>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText color="subdued" size="s">
                    {i18n.translate(
                      'xpack.streams.significantEventsDiscovery.settings.indexPatternsHelp',
                      {
                        defaultMessage:
                          'Comma-separated list of index patterns to use for feature detection and analysis.',
                      }
                    )}{' '}
                    {i18n.translate(
                      'xpack.streams.significantEventsDiscovery.settings.indexPatternsDefault',
                      { defaultMessage: 'Default:' }
                    )}{' '}
                    <EuiBadge color="hollow">{DEFAULT_INDEX_PATTERNS}</EuiBadge>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={5}>
              <EuiForm component="div">
                <EuiFormRow>
                  <EuiTextArea
                    data-test-subj="streams-settings-index-patterns"
                    value={indexPatterns}
                    onChange={(e) => setIndexPatterns(e.target.value)}
                    placeholder={DEFAULT_INDEX_PATTERNS}
                    rows={2}
                  />
                </EuiFormRow>
              </EuiForm>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiPanel>
      </EuiPanel>

      {saveError && (
        <>
          <EuiSpacer size="m" />
          <EuiCallOut
            announceOnMount
            title={i18n.translate(
              'xpack.streams.significantEventsDiscovery.settings.saveErrorTitle',
              { defaultMessage: 'Failed to save settings' }
            )}
            color="danger"
            iconType="error"
          >
            <p>{saveError.message}</p>
          </EuiCallOut>
        </>
      )}

      {hasChanges && (
        <EuiBottomBar data-test-subj="streams-significant-events-settings-bottom-bar">
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    data-test-subj="streams-settings-cancel-button"
                    color="text"
                    size="s"
                    onClick={handleCancel}
                    isDisabled={isSaving}
                  >
                    {i18n.translate(
                      'xpack.streams.significantEventsDiscovery.settings.cancelButton',
                      { defaultMessage: 'Cancel' }
                    )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButton
                    data-test-subj="streams-settings-save-button"
                    color="primary"
                    fill
                    size="s"
                    onClick={handleSave}
                    isLoading={isSaving}
                  >
                    {i18n.translate(
                      'xpack.streams.significantEventsDiscovery.settings.saveChangesButton',
                      { defaultMessage: 'Save changes' }
                    )}
                  </EuiButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiBottomBar>
      )}
    </>
  );
}
