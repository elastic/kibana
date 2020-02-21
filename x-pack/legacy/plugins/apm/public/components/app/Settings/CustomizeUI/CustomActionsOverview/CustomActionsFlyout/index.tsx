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
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { CustomAction } from '../../../../../../../../../../plugins/apm/server/lib/settings/custom_action/custom_action_types';
import { useApmPluginContext } from '../../../../../../hooks/useApmPluginContext';
import { useCallApmApi } from '../../../../../../hooks/useCallApmApi';
import { ActionSection } from './ActionSection';
import { Filter, FiltersSection } from './FiltersSection';
import { FlyoutFooter } from './Flyoutfooter';

interface Props {
  onClose: () => void;
  customActionSelected?: CustomAction;
}

export interface FormData {
  label: string;
  url: string;
  filters: Filter[];
}

export const CustomActionsFlyout = ({
  onClose,
  customActionSelected
}: Props) => {
  const callApmApiFromHook = useCallApmApi();
  const { toasts } = useApmPluginContext().core.notifications;
  const { register, handleSubmit, errors, control, watch } = useForm<
    FormData
  >();

  const onSubmit = handleSubmit((customAction: FormData) => {
    console.log('### caue: onSubmit -> customAction', customAction);
    // saveCustomAction({ callApmApi: callApmApiFromHook, customAction, toasts });
  });

  // Watch for any change on filters to render the component
  const filters = watch('filters');

  return (
    <EuiPortal>
      <EuiFlyout ownFocus onClose={onClose} size="m">
        <form onSubmit={onSubmit}>
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

            <ActionSection
              register={register}
              errors={errors}
              customAction={customActionSelected}
            />

            <EuiSpacer size="l" />

            <Controller
              as={
                <FiltersSection
                  filters={filters}
                  customAction={customActionSelected}
                />
              }
              name="filters"
              control={control}
              defaultValue={filters}
            />
          </EuiFlyoutBody>

          <FlyoutFooter onClose={onClose} />
        </form>
      </EuiFlyout>
    </EuiPortal>
  );
};
