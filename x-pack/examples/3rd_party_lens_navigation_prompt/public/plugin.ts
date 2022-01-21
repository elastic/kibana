/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DiscoverSetup } from 'src/plugins/discover/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { Plugin, CoreSetup, AppNavLinkStatus } from '../../../../src/core/public';
import { DataViewsPublicPluginStart, DataView } from '../../../../src/plugins/data_views/public';
import {
  DateHistogramIndexPatternColumn,
  LensPublicSetup,
  LensPublicStart,
} from '../../../plugins/lens/public';
import { DeveloperExamplesSetup } from '../../../../examples/developer_examples/public';
import { TypedLensByValueInput, PersistedIndexPatternLayer } from '../../../plugins/lens/public';

export interface SetupDependencies {
  developerExamples: DeveloperExamplesSetup;
  lens: LensPublicSetup;
  discover: DiscoverSetup;
}

export interface StartDependencies {
  dataViews: DataViewsPublicPluginStart;
  data: DataPublicPluginStart;
  lens: LensPublicStart;
}

function getLensAttributes(defaultDataView: DataView): TypedLensByValueInput['attributes'] {
  const dataLayer: PersistedIndexPatternLayer = {
    columnOrder: ['col1', 'col2'],
    columns: {
      col1: {
        dataType: 'date',
        isBucketed: true,
        label: '@timestamp',
        operationType: 'date_histogram',
        params: { interval: 'auto' },
        scale: 'interval',
        sourceField: defaultDataView.timeFieldName!,
      } as DateHistogramIndexPatternColumn,
      col2: {
        dataType: 'number',
        isBucketed: false,
        label: 'Average',
        operationType: 'average',
        scale: 'ratio',
        sourceField: defaultDataView.fields.find(
          (field) => field.aggregatable && field.type === 'number'
        )!.name,
      },
    },
  };

  return {
    visualizationType: 'lnsDatatable',
    title: 'Prefilled from example app',
    references: [
      {
        id: defaultDataView.id!,
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: defaultDataView.id!,
        name: 'indexpattern-datasource-layer-layer1',
        type: 'index-pattern',
      },
    ],
    state: {
      datasourceStates: {
        indexpattern: {
          layers: {
            layer1: dataLayer,
          },
        },
      },
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: {
        columns: [{ columnId: 'col1' }, { columnId: 'col2' }],
        layerId: 'layer1',
        layerType: 'DATA',
      },
    },
  };
}

export class EmbeddedLensExamplePlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  public setup(
    core: CoreSetup<StartDependencies>,
    { developerExamples, lens, discover }: SetupDependencies
  ) {
    core.application.register({
      id: 'third_party_lens_navigation_prompt',
      title: 'Third party Lens navigation prompt',
      navLinkStatus: AppNavLinkStatus.hidden,
      mount: (params) => {
        (async () => {
          const [, { lens: lensStart, dataViews }] = await core.getStartServices();
          const defaultDataView = await dataViews.getDefault();
          lensStart.navigateToPrefilledEditor({
            id: '',
            timeRange: {
              from: 'now-5d',
              to: 'now',
            },
            attributes: getLensAttributes(defaultDataView!),
          });
        })();
        return () => {};
      },
    });

    developerExamples.register({
      appId: 'third_party_lens_navigation_prompt',
      title: 'Third party Lens navigation prompt',
      description: 'Add custom menu entries to the Lens editor',
      links: [
        {
          label: 'README',
          href: 'https://github.com/elastic/kibana/tree/main/x-pack/examples/third_party_lens_navigation_prompt',
          iconType: 'logoGithub',
          size: 's',
          target: '_blank',
        },
      ],
    });

    if (!discover.locator) return;
    lens.registerTopNavMenuEntryGenerator(({ datasourceStates, query, filters }) => {
      if (!datasourceStates.indexpattern.state) return;

      return {
        label: 'Go to discover',
        iconType: 'discoverApp',
        run: async () => {
          const [, { data }] = await core.getStartServices();
          const firstLayer = Object.values(datasourceStates.indexpattern.state.layers)[0];
          discover.locator!.navigate({
            indexPatternId: firstLayer.indexPatternId,
            timeRange: data.query.timefilter.timefilter.getTime(),
            filters,
            query,
            columns: firstLayer.columnOrder
              .map((columnId) => firstLayer.columns[columnId].sourceField)
              .filter(Boolean),
          });
        },
      };
    });
  }

  public start() {}

  public stop() {}
}
