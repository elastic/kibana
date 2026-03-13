/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiLoadingSpinner,
  EuiPageTemplate,
  EuiSpacer,
} from '@elastic/eui';
import * as i18n from '../../../common/translations';
import { docLinks } from '../../../common/doc_links';
import { FeatureSection } from './feature_section';
import { ResetDefaultsModal } from './reset_defaults_modal';
import { useModelSettingsForm } from './use_model_settings_form';

export const ModelSettings: React.FC = () => {
  const {
    isLoading,
    isSaving,
    isDirty,
    assignments,
    sections,
    updateEndpoints,
    save,
    resetSection,
  } = useModelSettingsForm();

  const [resetParentKey, setResetParentKey] = useState<string | null>(null);

  const handleResetConfirm = useCallback(() => {
    if (!resetParentKey) return;
    resetSection(resetParentKey);
    setResetParentKey(null);
  }, [resetParentKey, resetSection]);

  return (
    <>
      <EuiPageTemplate.Header
        data-test-subj="modelSettingsPageHeader"
        pageTitle={i18n.SETTINGS_TITLE}
        bottomBorder
        rightSideItems={[
          <EuiButton
            fill
            onClick={save}
            isLoading={isSaving}
            isDisabled={!isDirty}
            data-test-subj="save-settings-button"
          >
            {i18n.SETTINGS_SAVE_BUTTON}
          </EuiButton>,
          <EuiButtonEmpty
            aria-label={i18n.API_DOCUMENTATION_LINK}
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
      <EuiPageTemplate.Section data-test-subj="modelSettingsContent">
        {isLoading ? (
          <EuiLoadingSpinner size="l" />
        ) : (
          sections.map(({ id, name, description, children }) => (
            <React.Fragment key={id}>
              <FeatureSection
                parentName={name}
                parentDescription={description}
                features={children.map((f) => ({
                  endpointIds: assignments[f.featureId] ?? f.recommendedEndpoints,
                  feature: f,
                }))}
                onReset={() => setResetParentKey(id)}
                onEndpointsChange={updateEndpoints}
              />
              <EuiSpacer size="xl" />
            </React.Fragment>
          ))
        )}
      </EuiPageTemplate.Section>

      {resetParentKey && (
        <ResetDefaultsModal
          onConfirm={handleResetConfirm}
          onCancel={() => setResetParentKey(null)}
        />
      )}
    </>
  );
};
