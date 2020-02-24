/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPortal,
  EuiSpacer,
  EuiText,
  EuiTitle
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { isEmpty } from 'lodash';
import { CustomAction } from '../../../../../../../../../../plugins/apm/server/lib/settings/custom_action/custom_action_types';
import { useApmPluginContext } from '../../../../../../hooks/useApmPluginContext';
import { useCallApmApi } from '../../../../../../hooks/useCallApmApi';
import { ActionSection } from './ActionSection';
import { Filter, FiltersSection } from './FiltersSection';
import { FlyoutFooter } from './FlyoutFooter';
import { saveCustomAction } from './saveCustomAction';

interface Props {
  onClose: () => void;
  customActionSelected?: CustomAction;
  onSave: () => void;
  onDelete: () => void;
}

export interface CustomActionFormData extends Omit<CustomAction, 'filters'> {
  filters: Filter[];
}

const convertFiltersToArray = (filters?: CustomAction['filters']) => {
  if (filters) {
    return Object.keys(filters).map(key => {
      return { key, value: filters[key] || '' };
    });
  }
};

const convertFiltersToObject = (
  filters: CustomActionFormData['filters']
): CustomAction['filters'] => {
  if (filters && filters.length) {
    return filters
      .filter(({ key, value }) => !isEmpty(key) && !isEmpty(value))
      .reduce((acc: Record<string, string>, { key, value }) => {
        acc[key] = value;
        return acc;
      }, {}) as CustomAction['filters'];
  }
};

export const CustomActionsFlyout = ({
  onClose,
  customActionSelected,
  onSave,
  onDelete
}: Props) => {
  const callApmApiFromHook = useCallApmApi();
  const [isLoading, setIsLoading] = useState(false);
  const { toasts } = useApmPluginContext().core.notifications;
  const { register, handleSubmit, errors, control, watch } = useForm<
    CustomActionFormData
  >({
    defaultValues: {
      ...customActionSelected,
      filters: convertFiltersToArray(customActionSelected?.filters)
    }
  });

  const onSubmit = async (customAction: CustomActionFormData) => {
    setIsLoading(true);
    await saveCustomAction({
      callApmApi: callApmApiFromHook,
      customAction: {
        ...customActionSelected,
        ...customAction,
        filters: convertFiltersToObject(customAction.filters)
      },
      toasts
    });
    setIsLoading(false);
    onSave();
  };
  // Watch for any change on filters to render the component
  const filters = watch('filters');

  return (
    <EuiPortal>
      <form onSubmit={handleSubmit(onSubmit)}>
        <EuiFlyout ownFocus onClose={onClose} size="m">
          <EuiFlyoutHeader hasBorder>
            <EuiTitle size="s">
              <h2>
                {i18n.translate(
                  'xpack.apm.settings.customizeUI.customActions.flyout.title',
                  {
                    defaultMessage: 'Create action'
                  }
                )}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiText>
              <p>
                {i18n.translate(
                  'xpack.apm.settings.customizeUI.customActions.flyout.label',
                  {
                    defaultMessage:
                      'Actions will be shown in the context of trace and error details througout the APM app. You can specify an unlimited amount of links, but we will opt to only show the first 3 alphabetically.'
                  }
                )}
              </p>
            </EuiText>

            <EuiSpacer size="l" />

            <ActionSection register={register} errors={errors} />

            <EuiSpacer size="l" />

            <Controller
              as={<FiltersSection filters={filters} />}
              name="filters"
              control={control}
            />
          </EuiFlyoutBody>

          <FlyoutFooter
            onClose={onClose}
            isLoading={isLoading}
            onDelete={onDelete}
            customActionId={customActionSelected?.id}
          />
        </EuiFlyout>
      </form>
    </EuiPortal>
  );
};
