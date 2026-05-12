/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '../../../common/lib/kibana';

interface BulkGetMetaResponseItem {
  id: string;
  type: string;
  meta?: { inAppUrl?: { path?: string; uiCapabilitiesPath?: string } };
}

interface Props {
  savedObjectId: string;
  title?: string;
}

/** Title-only event for a lens attachment carrying just a saved-object id. */
export const LensReferenceEvent = React.memo<Props>(({ savedObjectId, title }) => {
  const {
    services: { http },
  } = useKibana();
  const [href, setHref] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await http.post<BulkGetMetaResponseItem[]>(
          '/api/kibana/management/saved_objects/_bulk_get',
          { body: JSON.stringify([{ type: 'lens', id: savedObjectId }]) }
        );
        const path = resp?.[0]?.meta?.inAppUrl?.path;
        if (!cancelled && path) {
          setHref(http.basePath.prepend(path));
        }
      } catch {
        // Leave href undefined; renders as plain text.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [http, savedObjectId]);

  const label = title || savedObjectId;
  const link = href ? (
    <EuiLink href={href} data-test-subj="cases-lens-ref-link">
      {label}
    </EuiLink>
  ) : (
    label
  );

  return (
    <FormattedMessage
      id="xpack.cases.caseView.lens.addedLensReference"
      defaultMessage="added Lens visualization {link}"
      values={{ link }}
    />
  );
});

LensReferenceEvent.displayName = 'LensReferenceEvent';
