/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFieldText,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiSwitch,
  EuiTextArea,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from '../../common/constants';
import { useNotebook } from './notebook_context';
import { NotebookFlyout } from './notebook_flyout';

/** Settings for one app, opened from its tab menu. */
export const AppSettingsFlyout = ({ appId, onClose }: { appId: string; onClose: () => void }) => {
  const { store } = useNotebook();
  const apps = useStateFromPublishingSubject(store.apps$);
  const titleId = useGeneratedHtmlId({ prefix: 'notebookAppSettings' });
  const app = apps.find(({ id }) => id === appId);
  if (!app) return null;

  const setText = (key: 'heading' | 'description', value: string) =>
    store.updateApp(appId, (current) => {
      const { [key]: _previous, ...rest } = current;
      return value ? { ...rest, [key]: value } : rest;
    });

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
          fullWidth
          label={i18n.translate('xpack.notebook.appSettings.heading', {
            defaultMessage: 'Title',
          })}
        >
          <EuiFieldText
            fullWidth
            maxLength={MAX_TITLE_LENGTH}
            value={app.heading ?? ''}
            onChange={({ target: { value } }) => setText('heading', value)}
            data-test-subj="notebookAppSettingsHeading"
          />
        </EuiFormRow>
        <EuiFormRow
          fullWidth
          label={i18n.translate('xpack.notebook.appSettings.description', {
            defaultMessage: 'Description',
          })}
        >
          <EuiTextArea
            fullWidth
            rows={3}
            resize="vertical"
            maxLength={MAX_DESCRIPTION_LENGTH}
            value={app.description ?? ''}
            onChange={({ target: { value } }) => setText('description', value)}
            data-test-subj="notebookAppSettingsDescription"
          />
        </EuiFormRow>
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
        <EuiFormRow
          helpText={i18n.translate('xpack.notebook.appSettings.freePlacementHelp', {
            defaultMessage:
              'Panels stay where you drop them, leaving space between them, instead of moving up to fill it.',
          })}
        >
          <EuiSwitch
            label={i18n.translate('xpack.notebook.appSettings.freePlacement', {
              defaultMessage: 'Free panel placement',
            })}
            checked={app.freePlacement ?? false}
            onChange={({ target: { checked } }) =>
              store.updateApp(appId, ({ freePlacement, ...rest }) =>
                checked ? { ...rest, freePlacement: true } : rest
              )
            }
            data-test-subj="notebookAppSettingsFreePlacement"
          />
        </EuiFormRow>
      </EuiFlyoutBody>
    </NotebookFlyout>
  );
};
