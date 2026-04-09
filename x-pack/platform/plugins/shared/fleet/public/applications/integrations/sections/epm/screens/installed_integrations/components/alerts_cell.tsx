/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useMemo, useState } from 'react';

import { encode } from '@kbn/rison';
import { EuiLink } from '@elastic/eui';

import type { PackageListItem } from '../../../../../../../../common/types/models';
import { useStartServices } from '../../../../../hooks';

export const AlertsCell: React.FunctionComponent<{ package: PackageListItem }> = ({
  package: { title },
}) => {
  const { http } = useStartServices();

  const link = useMemo(() => {
    const state = encode({ tags: [title] });
    return http.basePath.prepend(
      `/app/management/insightsAndAlerting/triggersActions/rules?_a=${state}`
    );
  }, [title, http.basePath]);

  const [alertsCount, setAlertsCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchRulesCount = async () => {
      try {
        const res = await http.get<{ total: number }>('/api/alerting/rules/_find', {
          query: {
            filter: `alert.attributes.tags:"${title}"`,
            per_page: 0,
          },
        });
        if (!cancelled) {
          setAlertsCount(res.total);
        }
      } catch {
        if (!cancelled) {
          setAlertsCount(0);
        }
      }
    };

    fetchRulesCount();

    return () => {
      cancelled = true;
    };
  }, [title, http]);

  if (alertsCount === null || alertsCount === 0) {
    return <>-</>;
  }

  return (
    <EuiLink data-test-subj="installedIntegrationsAlertsLink" href={link}>
      {alertsCount}
    </EuiLink>
  );
};
