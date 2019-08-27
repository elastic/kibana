/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGrid, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { RegionMapChart } from '../RegionMapChart';
// @ts-ignore
import { MapEmbeddableFactory } from '../../../../../../../maps/public/embeddable/map_embeddable_factory';
import { APM_AVG_PAGE_LOAD_BY_COUNTRY_MAP_ID } from '../../../../../../server/lib/maps';
import { useUrlParams } from '../../../../../hooks/useUrlParams';

export const PageLoadCharts: React.SFC = () => {
  const [embeddable, setEmbeddable] = useState<any>(null);
  const embeddableContainerRef = useRef<HTMLDivElement>(null);
  const {
    urlParams: { serviceName, start, end }
  } = useUrlParams();

  const refreshMapEmbeddable = useCallback(
    mapEmpeddable => {
      const query = {
        query: `service.name:"${serviceName}" and transaction.type : "page-load"`,
        language: 'kuery'
      };
      const timeRange = {
        from: start,
        to: end
      };
      mapEmpeddable.updateInput({ timeRange, query });
    },
    [serviceName, start, end]
  );

  useEffect(() => {
    if (!embeddable) {
      new MapEmbeddableFactory()
        .createFromSavedObject(
          APM_AVG_PAGE_LOAD_BY_COUNTRY_MAP_ID,
          { viewMode: 'view', hidePanelTitles: false, isLayerTOCOpen: false },
          null
        )
        .then((mapEmpeddable: any) => {
          setEmbeddable(mapEmpeddable);
        });
    }

    return () => {
      if (embeddable) {
        embeddable.destroy();
      }
    };
  }, [embeddable, refreshMapEmbeddable]);

  useEffect(() => {
    if (embeddableContainerRef.current && embeddable) {
      embeddable.render(embeddableContainerRef.current);
    }
  }, [embeddable]);

  useEffect(() => {
    if (embeddable) {
      refreshMapEmbeddable(embeddable);
    }
  }, [embeddable, refreshMapEmbeddable]);

  return (
    <EuiFlexGrid columns={2} gutterSize="s">
      <EuiFlexItem>
        <EuiPanel>
          <EuiTitle size="xs">
            <span>
              {i18n.translate(
                'xpack.apm.metrics.pageLoadCharts.avgPageLoadByCountryLabel',
                {
                  defaultMessage:
                    'Avg. page load duration distribution by country'
                }
              )}
            </span>
          </EuiTitle>
          <RegionMapChart />
        </EuiPanel>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiPanel>
          <EuiTitle size="xs">
            <span>
              {i18n.translate(
                'xpack.apm.metrics.pageLoadCharts.avgPageLoadByCountryLabel',
                {
                  defaultMessage:
                    'Avg. page load duration distribution by country'
                }
              )}
            </span>
          </EuiTitle>
          <div
            style={{
              height: 256,
              display: 'flex',
              flex: '1 1 100%',
              zIndex: 1,
              minHeight: 0
            }}
            ref={embeddableContainerRef}
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGrid>
  );
};
