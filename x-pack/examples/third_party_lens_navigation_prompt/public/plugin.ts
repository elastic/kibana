/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { Plugin, CoreSetup, AppNavLinkStatus } from '@kbn/core/public';
import { DataViewsPublicPluginStart, DataView } from '@kbn/data-views-plugin/public';
import {
  DateHistogramIndexPatternColumn,
  IndexPatternPersistedState,
  LensPublicSetup,
  LensPublicStart,
} from '@kbn/lens-plugin/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import { TypedLensByValueInput, PersistedIndexPatternLayer } from '@kbn/lens-plugin/public';
import image from './image.png';

export interface SetupDependencies {
  developerExamples: DeveloperExamplesSetup;
  lens: LensPublicSetup;
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
        layerType: 'data',
      },
    },
  };
}

export class EmbeddedLensExamplePlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  public setup(core: CoreSetup<StartDependencies>, { developerExamples, lens }: SetupDependencies) {
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
      description:
        'Add custom menu entries to the Lens editor, like the "Debug in Playground" link in this example.',
      image,
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

    lens.registerTopNavMenuEntryGenerator(
      ({ visualizationId, visualizationState, datasourceStates, query, filters }) => {
        if (!datasourceStates.indexpattern.state || !visualizationState) return;

        return {
          label: 'Debug in Playground',
          iconType: 'wrench',
          run: async () => {
            const [coreStart] = await core.getStartServices();
            const datasourceState = datasourceStates.indexpattern
              .state as IndexPatternPersistedState;
            const layersIds = Object.keys(datasourceState.layers);
            const layers = Object.values(datasourceState.layers) as Array<
              PersistedIndexPatternLayer & { indexPatternId: string }
            >;
            const serializedFilters = JSON.parse(JSON.stringify(filters));
            coreStart.application.navigateToApp('testing_embedded_lens', {
              state: {
                visualizationType: visualizationId,
                title: 'Lens visualization',
                references: [
                  {
                    id: layers[0].indexPatternId,
                    name: 'indexpattern-datasource-current-indexpattern',
                    type: 'index-pattern',
                  },
                  ...layers.map(({ indexPatternId }, i) => ({
                    id: indexPatternId,
                    name: `indexpattern-datasource-layer-${layersIds[i]}`,
                    type: 'index-pattern',
                  })),
                ],
                state: {
                  datasourceStates: {
                    indexpattern: {
                      layers: datasourceState.layers,
                    },
                  },
                  visualization: visualizationState,
                  filters: serializedFilters,
                  query,
                },
              },
            });
          },
        };
      }
    );
  }

  public start() {}

  public stop() {}
}
