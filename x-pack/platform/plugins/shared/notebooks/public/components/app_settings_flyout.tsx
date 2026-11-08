/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiColorPicker,
  EuiFieldNumber,
  EuiFieldText,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiRange,
  EuiSwitch,
  EuiTextArea,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import {
  DEFAULT_GRID_GAP,
  HEX_COLOR_PATTERN,
  MAX_DESCRIPTION_LENGTH,
  MAX_GRID_COLUMNS,
  MAX_GRID_GAP,
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

/** Keeps a partly typed color in the field and only applies it once it is a complete hex color. */
const BackgroundColorField = ({
  color,
  onChange,
}: {
  color?: string;
  onChange: (color?: string) => void;
}) => {
  const [draft, setDraft] = useState(color ?? '');
  useEffect(() => setDraft(color ?? ''), [color]);
  const isValid = draft === '' || HEX_COLOR_PATTERN.test(draft);

  return (
    <EuiFormRow
      label={i18n.translate('xpack.notebook.appSettings.backgroundColor', {
        defaultMessage: 'Background color',
      })}
      helpText={i18n.translate('xpack.notebook.appSettings.backgroundColorHelp', {
        defaultMessage: 'Fills the app behind its panels. Clear it to use the theme background.',
      })}
      isInvalid={!isValid}
    >
      <EuiColorPicker
        color={draft}
        isClearable
        isInvalid={!isValid}
        placeholder={i18n.translate('xpack.notebook.appSettings.backgroundColorPlaceholder', {
          defaultMessage: 'Theme default',
        })}
        onChange={(text) => {
          setDraft(text);
          if (text === '') onChange(undefined);
          else if (HEX_COLOR_PATTERN.test(text)) onChange(text);
        }}
        data-test-subj="notebookAppSettingsBackgroundColor"
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
        <EuiFormRow
          label={i18n.translate('xpack.notebook.appSettings.gridGap', {
            defaultMessage: 'Grid gap',
          })}
          helpText={i18n.translate('xpack.notebook.appSettings.gridGapHelp', {
            defaultMessage: 'The space between panels, in pixels.',
          })}
        >
          <EuiRange
            min={0}
            max={MAX_GRID_GAP}
            step={1}
            value={app.gridGap ?? DEFAULT_GRID_GAP}
            showInput
            onChange={({ currentTarget: { value } }) => {
              const gap = Number(value);
              if (value === '' || !Number.isInteger(gap) || gap < 0 || gap > MAX_GRID_GAP) return;
              store.updateApp(appId, ({ gridGap, ...rest }) =>
                gap === DEFAULT_GRID_GAP ? rest : { ...rest, gridGap: gap }
              );
            }}
            data-test-subj="notebookAppSettingsGridGap"
          />
        </EuiFormRow>
        <BackgroundColorField
          color={app.backgroundColor}
          onChange={(color) =>
            store.updateApp(appId, ({ backgroundColor, ...rest }) =>
              color ? { ...rest, backgroundColor: color } : rest
            )
          }
        />
      </EuiFlyoutBody>
    </NotebookFlyout>
  );
};
