/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiSwitchEvent } from '@elastic/eui';
import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { DrilldownEditorProps } from '@kbn/embeddable-plugin/public';
import type { DiscoverDrilldownState } from '../../server';
import type { SetupContext } from './get_discover_drilldown';

export const DiscoverDrilldownEditor: React.FC<
  DrilldownEditorProps<DiscoverDrilldownState, SetupContext>
> = (props) => {
  return (
    <EuiFormRow hasChildLabel={false}>
      <EuiSwitch
        id="openInNewTab"
        name="openInNewTab"
        label={i18n.translate('xpack.lens.app.exploreDataInDiscoverDrilldown.newTabConfig', {
          defaultMessage: 'Open in new tab',
        })}
        checked={props.state.open_in_new_tab ?? false}
        onChange={(event: EuiSwitchEvent) =>
          props.onChange({ ...props.state, open_in_new_tab: event.target.checked })
        }
        data-test-subj="openInDiscoverDrilldownOpenInNewTab"
      />
    </EuiFormRow>
  );
};
