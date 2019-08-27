/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGrid, EuiFlexItem, EuiPanel, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useEffect, useState, useRef } from 'react';
import { RegionMapChart } from '../RegionMapChart';
import { EmbeddablePanel } from '../../../../../../../../../../src/legacy/core_plugins/embeddable_api/public/np_ready/public';
//@ts-ignore
import { MapEmbeddableFactory } from '../../../../../../../maps/public/embeddable/map_embeddable_factory';
import { useEmbeddable } from '../../../../../hooks/useEmbeddable';

export const PageLoadCharts: React.SFC = () => {
  const [embeddable, setEmbeddable] = useState<any>(null);
  const embeddableProps = useEmbeddable(embeddable);
  const embeddableContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    new MapEmbeddableFactory()
      .createFromSavedObject(
        'b9eaf720-c3a3-11e9-b3b7-590b5cc2c172',
        { viewMode: 'view', hidePanelTitles: false, isLayerTOCOpen: false },
        null
      )
      .then((embeddable: any) => {
        setEmbeddable(embeddable);
        const query = {
          query: 'service.name:"client" and transaction.type : "page-load"',
          language: 'kuery'
        };
        const timeRange = {
          from: new Date('2019-08-14T16:44:22.021Z').toISOString(),
          to: new Date('2019-08-26T21:55:52.381Z').toISOString()
        };
        embeddable.updateInput({ timeRange, query });
      })
      .catch((error: Error) => {
        console.error(error.stack);
      });

    return () => {
      if (embeddable) {
        embeddable.destroy();
      }
    };
  }, []);

  useEffect(() => {
    if (embeddableContainerRef.current && embeddable) {
      embeddable.render(embeddableContainerRef.current);
    }
  }, [embeddable]);

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
          {/*embeddableProps.embeddable ? (
            <EmbeddablePanel {...embeddableProps} />
          ) : null*/}
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
