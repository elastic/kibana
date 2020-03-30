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
import {
  CustomLink,
  Filter
} from '../../../../../../../../../../plugins/apm/common/custom_link/custom_link_types';
import { useApmPluginContext } from '../../../../../../hooks/useApmPluginContext';
import { FiltersSection } from './FiltersSection';
import { FlyoutFooter } from './FlyoutFooter';
import { LinkSection } from './LinkSection';
import { saveCustomLink } from './saveCustomLink';
import { LinkPreview } from './LinkPreview';
import { Documentation } from './Documentation';

interface Props {
  onClose: () => void;
  customLinkSelected?: CustomLink;
  onSave: () => void;
  onDelete: () => void;
  filters?: Filter[];
}

export const CustomLinkFlyout = ({
  onClose,
  customLinkSelected,
  onSave,
  onDelete,
  filters
}: Props) => {
  const { toasts } = useApmPluginContext().core.notifications;
  const [isSaving, setIsSaving] = useState(false);

  const [label, setLabel] = useState(customLinkSelected?.label || '');
  const [url, setUrl] = useState(customLinkSelected?.url || '');
  const _filters = customLinkSelected?.filters || filters;
  const filtersEmptyState: Filter[] = [{ key: '', value: '' }];
  const [selectedFilters, setSelectedFilters] = useState(
    _filters?.length ? _filters : filtersEmptyState
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
      filters: selectedFilters,
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
                      'Links will be available in the context of transaction details throughout the APM app. You can create an unlimited number of links. You can refer to dynamic variables by using any of the transaction metadata to fill in your URLs. More information, including examples, are available in the'
                  }
                )}{' '}
                <Documentation
                  label={i18n.translate(
                    'xpack.apm.settings.customizeUI.customLink.flyout.label.doc',
                    {
                      defaultMessage: 'documentation.'
                    }
                  )}
                />
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

            <FiltersSection
              filters={selectedFilters}
              onChangeFilters={setSelectedFilters}
            />

            <EuiSpacer size="l" />

            <LinkPreview label={label} url={url} filters={selectedFilters} />
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
