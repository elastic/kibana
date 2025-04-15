/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { RulesSettingsFlyout } from './rules_settings_flyout';
import { useKibana } from '../../../common/lib/kibana';

export const RulesSettingsLink = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const {
    application: {
      capabilities: { rulesSettings = {} },
    },
  } = useKibana().services;

  const { show, readFlappingSettingsUI, readQueryDelaySettingsUI } = rulesSettings;

  if (!show || (!readFlappingSettingsUI && !readQueryDelaySettingsUI)) {
    return null;
  }

  return (
    <>
      <EuiButtonEmpty
        onClick={() => setIsVisible(true)}
        iconType="gear"
        data-test-subj="rulesSettingsLink"
      >
        <FormattedMessage
          id="xpack.triggersActionsUI.rulesSettings.link.title"
          defaultMessage="Settings"
        />
      </EuiButtonEmpty>
      <RulesSettingsFlyout isVisible={isVisible} onClose={() => setIsVisible(false)} />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { RulesSettingsLink as default };
