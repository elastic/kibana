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
import { FiltersSection } from './FiltersSection';
import { FlyoutFooter } from './FlyoutFooter';
import { saveCustomAction } from './saveCustomAction';

interface Props {
  onClose: () => void;
  customActionSelected?: CustomAction;
  onSave: () => void;
  onDelete: () => void;
}

export interface CustomActionFormData extends Omit<CustomAction, 'filters'> {
  filters: Array<[string, string]>;
}

const convertFiltersToArray = (filters: CustomAction['filters'] = {}) => {
  const convertedFilters = Object.entries(filters);
  // When convertedFilters is empty, initiate the filters filled with one item.
  if (isEmpty(convertedFilters)) {
    convertedFilters.push(['', '']);
  }
  return convertedFilters;
};

const convertFiltersToObject = (filters: CustomActionFormData['filters']) => {
  const convertedFilters = Object.fromEntries(
    filters.filter(([key, value]) => !isEmpty(key) && !isEmpty(value))
  );
  if (!isEmpty(convertedFilters)) {
    return convertedFilters;
  }
};

export const CustomActionsFlyout = ({
  onClose,
  customActionSelected,
  onSave,
  onDelete
}: Props) => {
  const callApmApiFromHook = useCallApmApi();
  const { toasts } = useApmPluginContext().core.notifications;
  const [isSaving, setIsSaving] = useState(false);

  // form fields
  const [label, setLabel] = useState(customActionSelected?.label || '');
  const [url, setUrl] = useState(customActionSelected?.url || '');
  const [filters, setFilters] = useState(
    convertFiltersToArray(customActionSelected?.filters)
  );

  const { register, handleSubmit, errors, control, watch } = useForm<
    CustomActionFormData
  >({
    defaultValues: {
      ...customActionSelected,
      filters: convertFiltersToArray(customActionSelected?.filters)
    }
  });

  const onSubmit = async (
    event:
      | React.FormEvent<HTMLFormElement>
      | React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    setIsSaving(true);
    await saveCustomAction({
      id: customActionSelected?.id,
      label,
      url,
      filters: convertFiltersToObject(filters),
      callApmApi: callApmApiFromHook,
      toasts
    });
    setIsSaving(false);
    onSave();
  };

  return (
    <EuiPortal>
      <form onSubmit={onSubmit}>
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
                      'Actions will be available in the context of transaction details throughout the APM app. You can create an unlimited number of actions and use the filter options to scope them to only appear for specific services. You can refer to dynamic variables by using any of the transaction metadata to fill in your URLs. TODO: Learn more about it in the docs.'
                  }
                )}
              </p>
            </EuiText>

            <EuiSpacer size="l" />

            <ActionSection
              errors={errors}
              label={label}
              onChangeLabel={setLabel}
              url={url}
              onChangeUrl={setUrl}
            />

            <EuiSpacer size="l" />

            <FiltersSection filters={filters} onChangeFilters={setFilters} />
          </EuiFlyoutBody>

          <FlyoutFooter
            onClose={onClose}
            isSaving={isSaving}
            onDelete={onDelete}
            customActionId={customActionSelected?.id}
          />
        </EuiFlyout>
      </form>
    </EuiPortal>
  );
};
