/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnInfoCallout } from '@kbn/ui-callout';

/**
 * POC: imported alerts carry the import id as `rule.id`, which is not a rule, so the dispatcher
 * skips them. Remove this callout when action policies learn about imports.
 */
export const ImportsPocCallout = () => {
  const [isDismissed, setIsDismissed] = useState(false);
  if (isDismissed) {
    return null;
  }
  return (
    <>
      <KbnInfoCallout
        size="s"
        onDismiss={() => setIsDismissed(true)}
        title={i18n.translate('xpack.alertingV2.imports.pocCallout.title', {
          defaultMessage: "Imported alerts don't trigger action policies yet.",
        })}
        data-test-subj="importsPocCallout"
      />
      <EuiSpacer size="m" />
    </>
  );
};
