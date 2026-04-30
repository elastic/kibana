/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiPageTemplate,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Location } from 'history';
import { useHistory } from 'react-router-dom';
import { docLinks } from '../../../common/doc_links';
import { FeatureSection } from './feature_section';
import { DefaultModelSection } from './default_model_section';
import { NoModelsEmptyPrompt } from './no_models_empty_prompt';
import { ResetDefaultsModal } from './reset_defaults_modal';
import { UnsavedChangesModal } from './unsaved_changes_modal';
import { useModelSettingsForm } from './use_model_settings_form';
import { useDefaultModelSettings } from '../../hooks/use_default_model_settings';
import { useConnectors } from '../../hooks/use_connectors';
import { useKibana } from '../../hooks/use_kibana';
import { useUsageTracker } from '../../contexts/usage_tracker_context';
import { EventType } from '../../analytics/constants';

export const ModelSettings: React.FC = () => {
  const {
    isLoading,
    isSaving: isFeatureSaving,
    isDirty: isFeatureDirty,
    assignments,
    sections,
    invalidEndpointIds,
    hasSavedObject,
    dirtyFeatureIds,
    updateEndpoints,
    save: saveFeatures,
    resetSection,
  } = useModelSettingsForm();

  const defaultModelSettings = useDefaultModelSettings();
  const globalDefaultId = defaultModelSettings.savedState.defaultModelId;
  const { data: connectors, isLoading: connectorsLoading } = useConnectors();
  const {
    services: { application, http },
  } = useKibana();

  const isDirty = isFeatureDirty || defaultModelSettings.isDirty;
  const isSaving = isFeatureSaving;
  const hasNoModels = !connectorsLoading && connectors && !connectors.length;

  const history = useHistory();
  const unblockRef = useRef<(() => void) | null>(null);
  const [pendingLocation, setPendingLocation] = useState<Location | null>(null);
  const [resetParentKey, setResetParentKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isDirty) {
      unblockRef.current?.();
      unblockRef.current = null;
      return;
    }

    unblockRef.current = history.block((location) => {
      setPendingLocation(location);
      return false;
    });

    return () => {
      unblockRef.current?.();
      unblockRef.current = null;
    };
  }, [isDirty, history]);

  const usageTracker = useUsageTracker();

  const handleSave = useCallback(async () => {
    if (isFeatureDirty) {
      saveFeatures();
    }
    if (defaultModelSettings.isDirty) {
      await defaultModelSettings.save();
    }
    usageTracker.count(EventType.FEATURE_SETTINGS_SAVED);
  }, [isFeatureDirty, saveFeatures, defaultModelSettings, usageTracker]);

  const handleDiscardAndLeave = useCallback(() => {
    defaultModelSettings.reset();
    unblockRef.current?.();
    unblockRef.current = null;
    if (pendingLocation) {
      const url =
        http.basePath.prepend(pendingLocation.pathname) +
        pendingLocation.search +
        pendingLocation.hash;
      application.navigateToUrl(url, { state: pendingLocation.state });
    }
    setPendingLocation(null);
  }, [application, http.basePath, pendingLocation, defaultModelSettings]);

  const handleResetConfirm = useCallback(() => {
    if (!resetParentKey) return;
    resetSection(resetParentKey);
    setResetParentKey(null);
  }, [resetParentKey, resetSection]);

  const disallowOtherModels = defaultModelSettings.state.disallowOtherModels;

  if (connectorsLoading || isLoading) {
    return (
      <>
        <EuiPageTemplate.Section
          paddingSize="none"
          data-test-subj="modelSettingsContent"
          restrictWidth={true}
        >
          <EuiLoadingSpinner size="l" />
        </EuiPageTemplate.Section>
      </>
    );
  }

  if (hasNoModels) {
    return <NoModelsEmptyPrompt />;
  }

  return (
    <>
      <EuiPageTemplate.Header
        data-test-subj="modelSettingsPageHeader"
        pageTitle={i18n.translate('xpack.searchInferenceEndpoints.settings.title', {
          defaultMessage: 'Feature settings',
        })}
        bottomBorder
        paddingSize="none"
        restrictWidth={true}
        rightSideItems={[
          <EuiButton
            fill
            onClick={handleSave}
            isLoading={isSaving}
            isDisabled={!isDirty}
            data-test-subj="save-settings-button"
          >
            {i18n.translate('xpack.searchInferenceEndpoints.settings.saveButton', {
              defaultMessage: 'Save settings',
            })}
          </EuiButton>,
          <EuiButtonEmpty
            iconType="popout"
            iconSide="right"
            iconSize="s"
            flush="both"
            target="_blank"
            data-test-subj="settings-api-documentation"
            href={docLinks.featureSettings}
          >
            {i18n.translate('xpack.searchInferenceEndpoints.settings.documentationLabel', {
              defaultMessage: 'Documentation',
            })}
          </EuiButtonEmpty>,
        ]}
      />
      <EuiSpacer size="l" />
      <EuiPageTemplate.Section
        paddingSize="none"
        data-test-subj="modelSettingsContent"
        restrictWidth={true}
      >
        <DefaultModelSection defaultModelSettings={defaultModelSettings} />
        {disallowOtherModels ? null : (
          <>
            {invalidEndpointIds.size > 0 && (
              <>
                <EuiSpacer size="l" />
                <EuiCallOut
                  title={i18n.translate(
                    'xpack.searchInferenceEndpoints.settings.invalidEndpoints.title',
                    {
                      defaultMessage: 'Some assigned inference endpoints are no longer available',
                    }
                  )}
                  color="warning"
                  iconType="warning"
                  data-test-subj="invalidEndpointsCallout"
                  announceOnMount
                >
                  <p>
                    {i18n.translate(
                      'xpack.searchInferenceEndpoints.settings.invalidEndpoints.description',
                      {
                        defaultMessage:
                          'The following endpoints could not be found: {endpointList}. Features using these endpoints may not work as expected.',
                        values: {
                          endpointList: [...invalidEndpointIds].join(', '),
                        },
                      }
                    )}
                  </p>
                </EuiCallOut>
              </>
            )}

            <EuiSpacer size="xl" />

            {sections.length === 0 ? (
              <EuiEmptyPrompt
                iconType="gear"
                title={
                  <h2>
                    {i18n.translate('xpack.searchInferenceEndpoints.settings.noFeatures.title', {
                      defaultMessage: 'No features registered',
                    })}
                  </h2>
                }
                body={
                  <p>
                    {i18n.translate(
                      'xpack.searchInferenceEndpoints.settings.noFeatures.description',
                      {
                        defaultMessage:
                          'No features have been registered for inference settings in this project.',
                      }
                    )}
                  </p>
                }
                data-test-subj="settings-no-features"
              />
            ) : (
              sections.map((section) => (
                <React.Fragment key={section.featureId}>
                  <FeatureSection
                    parentName={section.featureName}
                    parentDescription={section.featureDescription}
                    features={section.children.map((f) => ({
                      endpointIds: assignments[f.featureId] ?? f.recommendedEndpoints,
                      feature: f,
                      hasSavedObject: hasSavedObject[f.featureId] ?? false,
                      isFeatureDirty: dirtyFeatureIds.has(f.featureId),
                    }))}
                    onReset={() => setResetParentKey(section.featureId)}
                    onEndpointsChange={updateEndpoints}
                    invalidEndpointIds={invalidEndpointIds}
                    isBeta={section.isBeta}
                    isTechPreview={section.isTechPreview}
                    globalDefaultId={globalDefaultId}
                  />
                  <EuiSpacer size="xl" />
                </React.Fragment>
              ))
            )}
          </>
        )}
      </EuiPageTemplate.Section>

      {resetParentKey && (
        <ResetDefaultsModal
          onConfirm={handleResetConfirm}
          onCancel={() => setResetParentKey(null)}
        />
      )}

      {pendingLocation && (
        <UnsavedChangesModal
          onConfirm={handleDiscardAndLeave}
          onCancel={() => setPendingLocation(null)}
        />
      )}
    </>
  );
};
