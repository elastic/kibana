/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { findPinnedTimeCell } from '../model/cell_factory';
import { getCellParamNames } from '../model/references';
import { useNotebook } from './notebook_context';

const GLOBAL_TIME_PARAMS = new Set(['_tstart', '_tend']);

export const NotebookSettingsFlyout = ({ onClose }: { onClose: () => void }) => {
  const { store } = useNotebook();
  const cells = useStateFromPublishingSubject(store.cells$);
  const titleId = useGeneratedHtmlId({ prefix: 'notebookSettings' });
  const isTimePickerEnabled = findPinnedTimeCell(cells) !== undefined;
  const timeConsumers = Object.values(cells).filter((cell) =>
    getCellParamNames(cell).some((name) => GLOBAL_TIME_PARAMS.has(name))
  ).length;

  return (
    <EuiFlyout
      ownFocus
      size="s"
      onClose={onClose}
      aria-labelledby={titleId}
      data-test-subj="notebookSettingsFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id={titleId}>
            {i18n.translate('xpack.notebook.settings.title', {
              defaultMessage: 'Notebook settings',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFormRow
          helpText={i18n.translate('xpack.notebook.settings.timePickerHelp', {
            defaultMessage:
              'Shows a time picker in the header and binds ?_tstart and ?_tend for every query.',
          })}
        >
          <EuiSwitch
            label={i18n.translate('xpack.notebook.settings.timePicker', {
              defaultMessage: 'Global time picker',
            })}
            checked={isTimePickerEnabled}
            onChange={(event) => store.setGlobalTimePicker(event.target.checked)}
            data-test-subj="notebookSettingsTimePicker"
          />
        </EuiFormRow>
        {!isTimePickerEnabled && timeConsumers > 0 && (
          <>
            <EuiSpacer size="m" />
            <KbnWarningCallout
              announceOnMount
              size="s"
              title={i18n.translate('xpack.notebook.settings.timeConsumers', {
                defaultMessage:
                  '{count, plural, one {# cell uses} other {# cells use}} ?_tstart or ?_tend and will error until the global time picker is enabled.',
                values: { count: timeConsumers },
              })}
              data-test-subj="notebookSettingsTimeConsumers"
            />
          </>
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
