/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiComboBox,
  EuiDescribedFormGroup,
  EuiFormRow,
  EuiHorizontalRule,
  EuiPanel,
  EuiSwitch,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { NO_DEFAULT_MODEL } from '../../../common/constants';
import { useConnectors } from '../../hooks/use_connectors';
import type { UseDefaultModelSettingsReturn } from '../../hooks/use_default_model_settings';
import type { DefaultModelValidationResult } from '../../hooks/use_default_model_validation';
import { useUsageTracker } from '../../contexts/usage_tracker_context';
import { EventType } from '../../analytics/constants';
import {
  getGlobalModelComboOptions,
  getGlobalModelSelectedOptions,
} from './default_model_section_combo';
import { SettingTitle } from './setting_title';

interface Props {
  defaultModelSettings: UseDefaultModelSettingsReturn;
  validation: DefaultModelValidationResult;
  disabled?: boolean;
}

const ENABLED_LABEL = i18n.translate('xpack.searchInferenceEndpoints.settings.toggle.enabled', {
  defaultMessage: 'Enabled',
});
const DISABLED_LABEL = i18n.translate('xpack.searchInferenceEndpoints.settings.toggle.disabled', {
  defaultMessage: 'Disabled',
});

export const DefaultModelSection: React.FC<Props> = ({
  defaultModelSettings,
  validation,
  disabled = false,
}) => {
  const { state, dirtyFields, setEnableAi, setDefaultModelId, setFeatureSpecificModels } =
    defaultModelSettings;
  const { data: connectors, isLoading: connectorsLoading } = useConnectors();
  const usageTracker = useUsageTracker();

  const options = useMemo(
    () => getGlobalModelComboOptions(connectors, state.featureSpecificModels),
    [connectors, state.featureSpecificModels]
  );
  const selectedOptions = useMemo(
    () => getGlobalModelSelectedOptions(state.defaultModelId, options, state.featureSpecificModels),
    [state.defaultModelId, options, state.featureSpecificModels]
  );

  const onChangeDefaultModel = (selected: EuiComboBoxOptionOption<string>[]) => {
    usageTracker.count(EventType.DEFAULT_MODEL_CHANGED);
    setDefaultModelId(selected[0]?.value ?? NO_DEFAULT_MODEL);
  };

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="l" data-test-subj="defaultModelSection">
      <EuiDescribedFormGroup
        data-test-subj="aiCapabilitiesRow"
        fullWidth
        gutterSize="xl"
        title={
          <SettingTitle
            data-test-subj="aiCapabilitiesTitle"
            isUnsaved={dirtyFields.has('enableAi')}
            title={i18n.translate('xpack.searchInferenceEndpoints.settings.aiCapabilities.title', {
              defaultMessage: 'AI capabilities',
            })}
          />
        }
        description={
          <p>
            {i18n.translate('xpack.searchInferenceEndpoints.settings.aiCapabilities.description', {
              defaultMessage: 'Enables AI capabilities in various features.',
            })}
          </p>
        }
      >
        <EuiFormRow
          fullWidth
          label={i18n.translate(
            'xpack.searchInferenceEndpoints.settings.aiCapabilities.fieldLabel',
            {
              defaultMessage: 'Use AI features',
            }
          )}
        >
          <EuiSwitch
            data-test-subj="enableAiSwitch"
            label={state.enableAi ? ENABLED_LABEL : DISABLED_LABEL}
            checked={state.enableAi}
            onChange={(e) => setEnableAi(e.target.checked)}
            disabled={disabled}
          />
        </EuiFormRow>
      </EuiDescribedFormGroup>

      {state.enableAi && (
        <>
          <EuiHorizontalRule margin="l" />
          <EuiDescribedFormGroup
            data-test-subj="globalModelRow"
            fullWidth
            gutterSize="xl"
            title={
              <SettingTitle
                data-test-subj="globalModelTitle"
                isUnsaved={dirtyFields.has('defaultModelId')}
                title={i18n.translate('xpack.searchInferenceEndpoints.settings.globalModel.title', {
                  defaultMessage: 'Global model',
                })}
              />
            }
            description={
              <p>
                {i18n.translate('xpack.searchInferenceEndpoints.settings.globalModel.description', {
                  defaultMessage:
                    'Choose a default model to use for AI features. Individual features can override this with their own model selection.',
                })}
              </p>
            }
          >
            <EuiFormRow
              fullWidth
              label={i18n.translate(
                'xpack.searchInferenceEndpoints.settings.globalModel.fieldLabel',
                {
                  defaultMessage: 'Global model',
                }
              )}
              isInvalid={validation.errors.length > 0}
              error={validation.errors as string[]}
            >
              <EuiComboBox
                data-test-subj="globalModelComboBox"
                placeholder={i18n.translate(
                  'xpack.searchInferenceEndpoints.settings.globalModel.placeholder',
                  {
                    defaultMessage: 'Select a default model',
                  }
                )}
                singleSelection={{ asPlainText: true }}
                options={options}
                selectedOptions={selectedOptions}
                onChange={onChangeDefaultModel}
                isLoading={connectorsLoading}
                isInvalid={validation.errors.length > 0}
                isClearable={false}
                isDisabled={disabled}
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>

          <EuiHorizontalRule margin="l" />
          <EuiDescribedFormGroup
            data-test-subj="featureSpecificModelsRow"
            fullWidth
            gutterSize="xl"
            title={
              <SettingTitle
                data-test-subj="featureSpecificModelsTitle"
                isUnsaved={dirtyFields.has('featureSpecificModels')}
                title={i18n.translate(
                  'xpack.searchInferenceEndpoints.settings.featureSpecificModels.title',
                  {
                    defaultMessage: 'Feature specific models',
                  }
                )}
              />
            }
            description={
              <p>
                {i18n.translate(
                  'xpack.searchInferenceEndpoints.settings.featureSpecificModels.description',
                  {
                    defaultMessage:
                      'Use the recommended models for features or customize per feature and choose your own set of models.',
                  }
                )}
              </p>
            }
          >
            <EuiFormRow
              fullWidth
              label={i18n.translate(
                'xpack.searchInferenceEndpoints.settings.featureSpecificModels.fieldLabel',
                {
                  defaultMessage: 'Feature specific models',
                }
              )}
            >
              <EuiSwitch
                data-test-subj="featureSpecificModelsSwitch"
                label={state.featureSpecificModels ? ENABLED_LABEL : DISABLED_LABEL}
                checked={state.featureSpecificModels}
                onChange={(e) => setFeatureSpecificModels(e.target.checked)}
                disabled={disabled}
              />
            </EuiFormRow>
          </EuiDescribedFormGroup>
        </>
      )}
    </EuiPanel>
  );
};
