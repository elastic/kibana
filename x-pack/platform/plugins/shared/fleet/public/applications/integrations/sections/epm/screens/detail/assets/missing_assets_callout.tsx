/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { FunctionComponent } from 'react';

import { EuiCallOut } from '@elastic/eui';

import { FormattedDate, FormattedMessage, FormattedTime } from '@kbn/i18n-react';

import type { InstallFailedAttempt } from '../../../../../../../../common/types';

interface Props {
  failedAttempt: InstallFailedAttempt;
}

/**
 * Shown at the top of the Assets tab when the latest install attempt failed post-install
 * verification because one or more Elasticsearch assets were missing. Mirrors the "Install
 * failed" framing and "Missing assets" line rendered in the Installed Integrations table's
 * failed-attempt popover (see `installation_version_status.tsx`'s `formatAttempt`) so the
 * phrasing is consistent across surfaces.
 */
export const MissingAssetsCallout: FunctionComponent<Props> = ({ failedAttempt }) => {
  if (!failedAttempt.missing_assets || failedAttempt.missing_assets.length === 0) {
    return null;
  }

  return (
    <EuiCallOut
      announceOnMount
      size="m"
      color="danger"
      iconType="error"
      title={
        <FormattedMessage
          id="xpack.fleet.epm.packageDetails.assets.missingAssetsTitle"
          defaultMessage="Install failed"
        />
      }
    >
      <p>
        <FormattedMessage
          id="xpack.fleet.epm.packageDetails.assets.missingAssetsFailedAtDescription"
          defaultMessage="Failed at {attemptDate}."
          values={{
            attemptDate: (
              <>
                <FormattedDate
                  value={failedAttempt.created_at}
                  year="numeric"
                  month="short"
                  day="numeric"
                />
                <> @ </>
                <FormattedTime
                  value={failedAttempt.created_at}
                  hour="numeric"
                  minute="numeric"
                  second="numeric"
                />
              </>
            ),
          }}
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.fleet.epm.packageDetails.assets.missingAssetsDescription"
          defaultMessage="Missing assets: {assets}"
          values={{
            assets: failedAttempt.missing_assets.map((a) => `${a.type}/${a.id}`).join(', '),
          }}
        />
      </p>
    </EuiCallOut>
  );
};
