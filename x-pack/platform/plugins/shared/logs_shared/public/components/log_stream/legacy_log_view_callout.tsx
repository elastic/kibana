/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const LegacyLogViewCallout: React.FC<{ upgradeAssistantUrl?: string }> = ({
  upgradeAssistantUrl,
}) => {
  const UpgradeAssistant = upgradeAssistantUrl ? (
    <EuiLink href={upgradeAssistantUrl}>{upgradeAssistantLabel}</EuiLink>
  ) : (
    upgradeAssistantLabel
  );

  return (
    <EuiCallOut title={legacyLogViewTitle} color="warning" iconType="alert">
      <p>
        <FormattedMessage
          id="xpack.logsShared.logStream.legacyLogViewDescription"
          defaultMessage="This view uses a deprecated configuration. Use the {UpgradeAssistant} to migrate to a supported configuration."
          values={{
            UpgradeAssistant,
          }}
        />
      </p>
    </EuiCallOut>
  );
};

const legacyLogViewTitle = i18n.translate('xpack.logsShared.logStream.legacyLogViewTitle', {
  defaultMessage: 'Deprecated Log Source Configuration',
});

const upgradeAssistantLabel = i18n.translate(
  'xpack.logsShared.logStream.upgradeAssistantLinkText',
  {
    defaultMessage: 'Upgrade Assistant',
  }
);
