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
  EuiEmptyPrompt,
  EuiLoadingSpinner,
  EuiPageTemplate,
  EuiSpacer,
} from '@elastic/eui';
import type { Location } from 'history';
import { useHistory } from 'react-router-dom';
import * as i18n from '../../../common/translations';
import { docLinks } from '../../../common/doc_links';
import { FeatureSection } from './feature_section';
import { DefaultModelSection } from './default_model_section';
import { NoModelsEmptyPrompt } from './no_models_empty_prompt';
import { ResetDefaultsModal } from './reset_defaults_modal';
import { UnsavedChangesModal } from './unsaved_changes_modal';
import { useModelSettingsForm } from './use_model_settings_form';
import { useDefaultModelSettings } from '../../hooks/use_default_model_settings';
import { useConnectors } from '../../hooks/use_connectors';

export const ModelSettings: React.FC = () => {
  const {
    isLoading,
    isSaving: isFeatureSaving,
    isDirty: isFeatureDirty,
    assignments,
    sections,
    updateEndpoints,
    save: saveFeatures,
    resetSection,
  } = useModelSettingsForm();

  const defaultModelSettings = useDefaultModelSettings();
  const { connectors, loading: connectorsLoading } = useConnectors();

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

  const handleSave = useCallback(async () => {
    if (isFeatureDirty) {
      saveFeatures();
    }
    if (defaultModelSettings.isDirty) {
      await defaultModelSettings.save();
    }
  }, [isFeatureDirty, saveFeatures, defaultModelSettings]);

  const handleDiscardAndLeave = useCallback(() => {
    defaultModelSettings.reset();
    unblockRef.current?.();
    unblockRef.current = null;
    if (pendingLocation) {
      history.push(pendingLocation);
    }
    setPendingLocation(null);
  }, [history, pendingLocation, defaultModelSettings]);

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
        pageTitle={i18n.SETTINGS_TITLE}
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
            {i18n.SETTINGS_SAVE_BUTTON}
          </EuiButton>,
          <EuiButtonEmpty
            iconType="popout"
            iconSide="right"
            iconSize="s"
            flush="both"
            target="_blank"
            data-test-subj="settings-api-documentation"
            href={docLinks.createInferenceEndpoint}
          >
            {i18n.API_DOCUMENTATION_LINK}
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
            <EuiSpacer size="xl" />

            {sections.length === 0 ? (
              <EuiEmptyPrompt
                iconType="gear"
                title={<h2>{i18n.SETTINGS_NO_FEATURES_TITLE}</h2>}
                body={<p>{i18n.SETTINGS_NO_FEATURES_DESCRIPTION}</p>}
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
                    }))}
                    onReset={() => setResetParentKey(section.featureId)}
                    onEndpointsChange={updateEndpoints}
                    isBeta={section.isBeta}
                    isTechPreview={section.isTechPreview}
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
