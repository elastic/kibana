/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiFieldNumber,
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
import {
  MAX_DESCRIPTION_LENGTH,
  MAX_GRID_COLUMNS,
  MAX_TITLE_LENGTH,
  MIN_GRID_COLUMNS,
} from '../../common/constants';
import { getGridColumns, setGridColumns } from '../model/app_layout';
import { useNotebook } from './notebook_context';
import { NotebookFlyout } from './notebook_flyout';

/** Applies the number when it is committed rather than on each keystroke, since resizing panels to fit is lossy. */
const GridColumnsField = ({
  columns,
  onChange,
}: {
  columns: number;
  onChange: (columns: number) => void;
}) => {
  const [draft, setDraft] = useState(String(columns));
  useEffect(() => setDraft(String(columns)), [columns]);
  const value = Number(draft);
  const isValid =
    draft !== '' &&
    Number.isInteger(value) &&
    value >= MIN_GRID_COLUMNS &&
    value <= MAX_GRID_COLUMNS;

  const commit = () => {
    if (!isValid) return setDraft(String(columns));
    if (value !== columns) onChange(value);
  };

  return (
    <EuiFormRow
      label={i18n.translate('xpack.notebook.appSettings.gridColumns', {
        defaultMessage: 'Grid columns',
      })}
      helpText={i18n.translate('xpack.notebook.appSettings.gridColumnsHelp', {
        defaultMessage:
          'Between {min} and {max}. Panels are resized to keep their share of the width.',
        values: { min: MIN_GRID_COLUMNS, max: MAX_GRID_COLUMNS },
      })}
      isInvalid={!isValid}
    >
      <EuiFieldNumber
        min={MIN_GRID_COLUMNS}
        max={MAX_GRID_COLUMNS}
        step={1}
        value={draft}
        isInvalid={!isValid}
        onChange={({ target }) => setDraft(target.value)}
        onBlur={commit}
        onKeyDown={({ key }) => {
          if (key === 'Enter') commit();
        }}
        data-test-subj="notebookAppSettingsGridColumns"
      />
    </EuiFormRow>
  );
};

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
        <EuiFormRow
          helpText={i18n.translate('xpack.notebook.appSettings.snapToGridHelp', {
            defaultMessage:
              'Panels line up with the grid as you move and resize them. Turn off to place them more precisely; hold Shift while dragging to line up with the grid again.',
          })}
        >
          <EuiSwitch
            label={i18n.translate('xpack.notebook.appSettings.snapToGrid', {
              defaultMessage: 'Snap to grid',
            })}
            checked={app.snapToGrid ?? true}
            onChange={({ target: { checked } }) =>
              store.updateApp(appId, ({ snapToGrid, ...rest }) =>
                checked ? rest : { ...rest, snapToGrid: false }
              )
            }
            data-test-subj="notebookAppSettingsSnapToGrid"
          />
        </EuiFormRow>
        <GridColumnsField
          columns={getGridColumns(app)}
          onChange={(columns) =>
            store.updateApp(appId, (current) => setGridColumns(current, columns))
          }
        />
      </EuiFlyoutBody>
    </NotebookFlyout>
  );
};
