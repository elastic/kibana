/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiSwitch,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { useNotebook } from './notebook_context';
import { NotebookFlyout } from './notebook_flyout';

/** Settings for one app, opened from its tab menu. */
export const AppSettingsFlyout = ({ appId, onClose }: { appId: string; onClose: () => void }) => {
  const { store } = useNotebook();
  const apps = useStateFromPublishingSubject(store.apps$);
  const titleId = useGeneratedHtmlId({ prefix: 'notebookAppSettings' });
  const app = apps.find(({ id }) => id === appId);
  if (!app) return null;

  return (
    <NotebookFlyout
      ownFocus
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="notebookAppSettingsFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId}>
            {i18n.translate('xpack.notebook.appSettings.title', {
              defaultMessage: '{title} settings',
              values: { title: app.title },
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFormRow
          helpText={i18n.translate('xpack.notebook.appSettings.hideTimePickerHelp', {
            defaultMessage:
              'Hides the global time picker on this app, even when its cells use the time range.',
          })}
        >
          <EuiSwitch
            label={i18n.translate('xpack.notebook.appSettings.hideTimePicker', {
              defaultMessage: 'Always hide the global time picker',
            })}
            checked={app.hideTimePicker ?? false}
            onChange={({ target: { checked } }) =>
              store.updateApp(appId, ({ hideTimePicker, ...rest }) =>
                checked ? { ...rest, hideTimePicker: true } : rest
              )
            }
            data-test-subj="notebookAppSettingsHideTimePicker"
          />
        </EuiFormRow>
      </EuiFlyoutBody>
    </NotebookFlyout>
  );
};
