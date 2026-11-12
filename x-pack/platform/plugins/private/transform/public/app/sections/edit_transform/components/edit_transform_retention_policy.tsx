/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, type FC } from 'react';

import { EuiCheckbox, EuiFormRow, EuiSelect, EuiSpacer } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { PROJECT_ROUTING } from '@kbn/cps-utils';

import type { PostTransformsPreviewRequestSchema } from '../../../../../server/routes/api_schemas/transforms';
import { isLatestTransform, isPivotTransform } from '../../../../../common/types/transform';
import { getErrorMessage } from '../../../../../common/utils/errors';

import { useAppDependencies, useToastNotifications } from '../../../app_dependencies';
import { useGetTransformsPreview } from '../../../hooks';
import {
  isLinkedProjectScopedSourceIndexUnavailableError,
  isProjectScopedSourceIndexUnavailableError,
} from '../../../hooks/use_transform_config_data';
import { useToastNotificationText } from '../../../components';

import {
  useEditTransformFlyoutActions,
  useEditTransformFlyoutContext,
} from '../state_management/edit_transform_flyout_state';
import { useFormSections } from '../state_management/selectors/form_sections';
import { useRetentionPolicyField } from '../state_management/selectors/retention_policy_field';

import { EditTransformDurationInput } from './edit_transform_duration_input';
import { EditTransformFlyoutFormTextInput } from './edit_transform_flyout_form_text_input';

export const EditTransformRetentionPolicy: FC = () => {
  const { cps } = useAppDependencies();
  const toastNotifications = useToastNotifications();
  const getToastNotificationText = useToastNotificationText();
  const cpsManager = cps?.cpsManager;

  const { config, dataViewId } = useEditTransformFlyoutContext();
  const formSections = useFormSections();
  const retentionPolicyField = useRetentionPolicyField();
  const { setFormField, setFormSection } = useEditTransformFlyoutActions();

  const previewRequest: PostTransformsPreviewRequestSchema = useMemo(() => {
    return {
      source: config.source,
      ...(isPivotTransform(config) ? { pivot: config.pivot } : {}),
      ...(isLatestTransform(config) ? { latest: config.latest } : {}),
    };
  }, [config]);

  const { error: transformsPreviewError, data: transformPreview } =
    useGetTransformsPreview(previewRequest);

  const destIndexAvailableTimeFields = useMemo<string[]>(() => {
    if (transformPreview?.generated_dest_index) {
      const properties = transformPreview.generated_dest_index.mappings.properties;
      const timeFields: string[] = Object.keys(properties).filter(
        (col) => properties[col].type === 'date'
      );

      return timeFields;
    }
    return [];
  }, [transformPreview]);

  useEffect(() => {
    if (transformsPreviewError === null) {
      return;
    }

    const addPreviewErrorToast = () => {
      toastNotifications.addDanger({
        title: i18n.translate('xpack.transform.transformList.errorGettingTransformPreview', {
          defaultMessage: 'An error occurred fetching the transform preview',
        }),
        ...getToastNotificationText(getErrorMessage(transformsPreviewError)),
      });
    };

    const projectRouting = config.source.project_routing;
    const isProjectScopedSourceIndexError = isProjectScopedSourceIndexUnavailableError(
      transformsPreviewError,
      projectRouting
    );

    if (!isProjectScopedSourceIndexError) {
      addPreviewErrorToast();
      return;
    }

    if (projectRouting === PROJECT_ROUTING.ORIGIN) {
      addPreviewErrorToast();
      return;
    }

    if (!cpsManager) {
      addPreviewErrorToast();
      return;
    }

    let isMounted = true;

    void cpsManager
      .fetchProjects(PROJECT_ROUTING.ORIGIN)
      .then((projectsData) => {
        const shouldSuppressErrorToast = isLinkedProjectScopedSourceIndexUnavailableError(
          transformsPreviewError,
          projectRouting,
          projectsData?.origin?._id
        );

        if (isMounted && !shouldSuppressErrorToast) {
          addPreviewErrorToast();
        }
      })
      .catch(() => {
        if (isMounted) {
          addPreviewErrorToast();
        }
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transformsPreviewError]);

  const isRetentionPolicyAvailable = destIndexAvailableTimeFields.length > 0;
  const retentionDateFieldOptions = useMemo(() => {
    return Array.isArray(destIndexAvailableTimeFields)
      ? destIndexAvailableTimeFields.map((text: string) => ({ text, value: text }))
      : [];
  }, [destIndexAvailableTimeFields]);

  if (!isRetentionPolicyAvailable) {
    return null;
  }

  return (
    <>
      <EuiCheckbox
        id="transformEditRetentionPolicyCheckbox"
        name="transformEditRetentionPolicyCheckbox"
        label={i18n.translate(
          'xpack.transform.transformList.editFlyoutFormRetentionPolicySwitchLabel',
          {
            defaultMessage: 'Retention policy',
          }
        )}
        checked={formSections.retentionPolicy.enabled}
        onChange={(event) =>
          setFormSection({
            section: 'retentionPolicy',
            enabled: event.target.checked,
          })
        }
        data-test-subj="transformEditRetentionPolicySwitch"
      />
      {formSections.retentionPolicy.enabled && (
        <div data-test-subj="transformEditRetentionPolicyContent">
          <EuiSpacer size="m" />
          {
            // If data view or date fields info not available
            // gracefully defaults to text input
            dataViewId ? (
              <EuiFormRow
                label={i18n.translate(
                  'xpack.transform.transformList.editFlyoutFormRetentionPolicyFieldLabel',
                  {
                    defaultMessage: 'Field',
                  }
                )}
                isInvalid={retentionPolicyField.errorMessages.length > 0}
                error={retentionPolicyField.errorMessages}
                fullWidth
                helpText={i18n.translate(
                  'xpack.transform.transformList.editFlyoutFormRetentionPolicyDateFieldHelpText',
                  {
                    defaultMessage:
                      'Select the date field that can be used to identify out of date documents in the destination index.',
                  }
                )}
              >
                <EuiSelect
                  isInvalid={retentionPolicyField.errorMessages.length > 0}
                  aria-label={i18n.translate(
                    'xpack.transform.transformList.editFlyoutFormRetentionPolicyFieldSelectAriaLabel',
                    {
                      defaultMessage: 'Date field to set retention policy',
                    }
                  )}
                  data-test-subj="transformEditFlyoutRetentionPolicyFieldSelect"
                  fullWidth
                  options={retentionDateFieldOptions}
                  value={retentionPolicyField.value}
                  onChange={(e) =>
                    setFormField({ field: 'retentionPolicyField', value: e.target.value })
                  }
                  hasNoInitialSelection={
                    !retentionDateFieldOptions
                      .map((d) => d.text)
                      .includes(retentionPolicyField.value)
                  }
                />
              </EuiFormRow>
            ) : (
              <EditTransformFlyoutFormTextInput
                field="retentionPolicyField"
                label={i18n.translate(
                  'xpack.transform.transformList.editFlyoutFormRetentionPolicyFieldLabel',
                  {
                    defaultMessage: 'Field',
                  }
                )}
              />
            )
          }
          <EditTransformDurationInput
            defaultUnit="d"
            field="retentionPolicyMaxAge"
            label={i18n.translate(
              'xpack.transform.transformList.editFlyoutFormRetentionPolicyMaxAgeLabel',
              {
                defaultMessage: 'Max age',
              }
            )}
            units={['nanos', 'micros', 'ms', 's', 'm', 'h', 'd']}
          />
        </div>
      )}
    </>
  );
};
