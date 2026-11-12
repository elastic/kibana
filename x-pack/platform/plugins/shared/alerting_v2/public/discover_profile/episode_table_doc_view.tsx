/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiPanel, EuiSkeletonText } from '@elastic/eui';
import type { DocViewsRegistry } from '@kbn/unified-doc-viewer';
import { getRootEsqlQuery } from '@kbn/alerting-v2-schemas';
import type { AlertEpisodeDetailsServices } from '@kbn/alerting-v2-episodes-ui/components/details/types';
import {
  isRuleLoaded,
  isRuleLoading,
  useFetchRule,
} from '@kbn/alerting-v2-episodes-ui/hooks/use_fetch_rule';
import { useAlertingEpisodeSourceDataView } from '@kbn/alerting-v2-episodes-ui/hooks/use_alerting_episode_source_data_view';
import { withFlattenedEpisodeData } from './with_flattened_episode_data';
import { withEpisodeDataFields } from './with_episode_data_fields';

// The package doesn't export the doc view types, so they come from the registry.
type DocViewRenderFunction = ReturnType<DocViewsRegistry['getAll']>[number]['render'];

export interface EpisodeTableDocViewProps {
  renderTable: DocViewRenderFunction;
  renderProps: Parameters<DocViewRenderFunction>[0];
  services: Pick<AlertEpisodeDetailsServices, 'data' | 'dataViews' | 'http'>;
}

/**
 * Renders Discover's table for an episode row with its data split into `data.*` rows, typed
 * with the data view of the rule query.
 */
export const EpisodeTableDocView = ({
  renderTable,
  renderProps,
  services,
}: EpisodeTableDocViewProps) => {
  const { hit, dataView } = renderProps;
  const ruleId = hit.flattened['rule.id'] as string | undefined;
  const flattenedHit = useMemo(() => withFlattenedEpisodeData(hit), [hit]);

  const { ruleState } = useFetchRule({ id: ruleId, http: services.http });
  const { value: sourceDataView, loading: isSourceDataViewLoading } =
    useAlertingEpisodeSourceDataView({
      query: isRuleLoaded(ruleState) ? getRootEsqlQuery(ruleState.rule.query) : undefined,
      dataViews: services.dataViews,
      http: services.http,
    });
  // Without the rule the data rows stay untyped, like any field the data view lacks.
  const typedDataView = useMemo(
    () =>
      sourceDataView
        ? withEpisodeDataFields(dataView, sourceDataView, services.data.fieldFormats)
        : dataView,
    [dataView, sourceDataView, services.data.fieldFormats]
  );

  // Waits for the types, so the table doesn't remount once they arrive.
  if (isRuleLoading(ruleState) || isSourceDataViewLoading) {
    return (
      <EuiPanel hasShadow={false} color="transparent" paddingSize="m">
        <EuiSkeletonText lines={8} size="s" />
      </EuiPanel>
    );
  }

  return renderTable({ ...renderProps, hit: flattenedHit, dataView: typedDataView });
};
