/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface PackMigrationAdvisoryProps {
  packId: string;
}

const SESSION_KEY_PREFIX = 'osquery.pack.migration-advisory-dismissed.';

/**
 * Shown once per session when an existing pack has non-uniform per-query
 * `version` or `(snapshot, removed)` pairs — indicating the user may want
 * to migrate to the pack-level defaults introduced in V5.
 */
export const PackMigrationAdvisory: React.FC<PackMigrationAdvisoryProps> = ({ packId }) => {
  const sessionKey = SESSION_KEY_PREFIX + packId;
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(sessionKey) === 'true');

  const handleDismiss = useCallback(() => {
    sessionStorage.setItem(sessionKey, 'true');
    setDismissed(true);
  }, [sessionKey]);

  if (dismissed) return null;

  return (
    <>
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.osquery.pack.form.migrationAdvisory.title"
            defaultMessage="Non-uniform per-query settings detected"
          />
        }
        color="warning"
        iconType="warning"
        onDismiss={handleDismiss}
        data-test-subj="pack-migration-advisory"
      >
        <FormattedMessage
          id="xpack.osquery.pack.form.migrationAdvisory.body"
          defaultMessage="This pack has queries with different minimum osquery versions or result types. You can now set pack-level defaults above and let individual queries inherit them. Existing per-query values are preserved until you save."
        />
      </EuiCallOut>
      <EuiSpacer size="m" />
    </>
  );
};
