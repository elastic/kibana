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
import { isEmpty } from 'lodash';
import React, { useState } from 'react';
import { CustomLink } from '../../../../../../../../../../plugins/apm/server/lib/settings/custom_link/custom_link_types';
import { useApmPluginContext } from '../../../../../../hooks/useApmPluginContext';
import { LinkSection } from './LinkSection';
import { FiltersSection } from './FiltersSection';
import { FlyoutFooter } from './FlyoutFooter';
import { saveCustomLink } from './saveCustomLink';

interface Props {
  onClose: () => void;
  customLinkSelected?: CustomLink;
  onSave: () => void;
  onDelete: () => void;
}

export interface CustomLinkFormData extends Omit<CustomLink, 'filters'> {
  filters: Array<[string, string]>;
}

const convertFiltersToArray = (filters: CustomLink['filters'] = {}) => {
  const convertedFilters = Object.entries(filters);
  // When convertedFilters is empty, initiate the filters filled with one item.
  if (isEmpty(convertedFilters)) {
    convertedFilters.push(['', '']);
  }
  return convertedFilters;
};

const convertFiltersToObject = (filters: CustomLinkFormData['filters']) => {
  const convertedFilters = Object.fromEntries(
    filters.filter(([key, value]) => !isEmpty(key) && !isEmpty(value))
  );
  if (!isEmpty(convertedFilters)) {
    return convertedFilters;
  }
};

export const CustomLinkFlyout = ({
  onClose,
  customLinkSelected,
  onSave,
  onDelete
}: Props) => {
  const { toasts } = useApmPluginContext().core.notifications;
  const [isSaving, setIsSaving] = useState(false);

  // form fields
  const [label, setLabel] = useState(customLinkSelected?.label || '');
  const [url, setUrl] = useState(customLinkSelected?.url || '');
  const [filters, setFilters] = useState(
    convertFiltersToArray(customLinkSelected?.filters)
  );

  const isFormValid = !!label && !!url;

  const onSubmit = async (
    event:
      | React.FormEvent<HTMLFormElement>
      | React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    setIsSaving(true);
    await saveCustomLink({
      id: customLinkSelected?.id,
      label,
      url,
      filters: convertFiltersToObject(filters),
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
                  'xpack.apm.settings.customizeUI.customLink.flyout.title',
                  {
                    defaultMessage: 'Create link'
                  }
                )}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiText>
              <p>
                {i18n.translate(
                  'xpack.apm.settings.customizeUI.customLink.flyout.label',
                  {
                    defaultMessage:
                      'Links will be available in the context of transaction details throughout the APM app. You can create an unlimited number of links and use the filter options to scope them to only appear for specific services. You can refer to dynamic variables by using any of the transaction metadata to fill in your URLs. TODO: Learn more about it in the docs.'
                  }
                )}
              </p>
            </EuiText>

            <EuiSpacer size="l" />

            <LinkSection
              label={label}
              onChangeLabel={setLabel}
              url={url}
              onChangeUrl={setUrl}
            />

            <EuiSpacer size="l" />

            <FiltersSection filters={filters} onChangeFilters={setFilters} />
          </EuiFlyoutBody>

          <FlyoutFooter
            isSaveButtonEnabled={isFormValid}
            onClose={onClose}
            isSaving={isSaving}
            onDelete={onDelete}
            customLinkId={customLinkSelected?.id}
          />
        </EuiFlyout>
      </form>
    </EuiPortal>
  );
};
