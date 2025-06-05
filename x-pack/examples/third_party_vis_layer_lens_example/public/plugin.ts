/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { Plugin, CoreSetup } from '@kbn/core/public';
import { DataViewsPublicPluginStart, DataView } from '@kbn/data-views-plugin/public';
import { LensPublicSetup, LensPublicStart } from '@kbn/lens-plugin/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import type {
  TypedLensByValueInput,
  PersistedIndexPatternLayer,
  XYState,
  FormulaPublicApi,
  DateHistogramIndexPatternColumn,
} from '@kbn/lens-plugin/public';
import { getXYStaticLayer } from './visualizationLayer';
import image from './image.png';

export interface SetupDependencies {
  developerExamples: DeveloperExamplesSetup;
  lens: LensPublicSetup;
  expressions: ExpressionsSetup;
}

export interface StartDependencies {
  dataViews: DataViewsPublicPluginStart;
  lens: LensPublicStart;
  fieldFormats: FieldFormatsStart;
}

function getLensAttributes(
  color: string,
  dataView: DataView,
  formula: FormulaPublicApi
): TypedLensByValueInput['attributes'] {
  const baseLayer: PersistedIndexPatternLayer = {
    columnOrder: ['col1'],
    columns: {
      col1: {
        dataType: 'date',
        isBucketed: true,
        label: '@timestamp',
        operationType: 'date_histogram',
        params: { interval: 'auto' },
        scale: 'interval',
        sourceField: dataView.timeFieldName!,
      } as DateHistogramIndexPatternColumn,
    },
  };

  const dataLayer = formula.insertOrReplaceFormulaColumn(
    'col2',
    { formula: 'count()' },
    baseLayer,
    dataView
  );

  const xyConfig: XYState = {
    axisTitlesVisibilitySettings: { x: true, yLeft: true, yRight: true },
    fittingFunction: 'None',
    gridlinesVisibilitySettings: { x: true, yLeft: true, yRight: true },
    layers: [
      {
        accessors: ['col2'],
        layerId: 'layer1',
        layerType: 'data',
        seriesType: 'bar_stacked',
        xAccessor: 'col1',
        yConfig: [{ forAccessor: 'col2', color }],
      },
    ],
    legend: { isVisible: true, position: 'right' },
    preferredSeriesType: 'bar_stacked',
    tickLabelsVisibilitySettings: { x: true, yLeft: true, yRight: true },
    valueLabels: 'hide',
  };

  return {
    visualizationType: 'lnsXY',
    title: 'Prefilled from example app',
    references: [
      {
        id: dataView.id!,
        name: 'indexpattern-datasource-current-indexpattern',
        type: 'index-pattern',
      },
      {
        id: dataView.id!,
        name: 'indexpattern-datasource-layer-layer1',
        type: 'index-pattern',
      },
    ],
    state: {
      datasourceStates: {
        formBased: {
          layers: {
            layer1: dataLayer!,
          },
        },
      },
      filters: [],
      query: { language: 'kuery', query: '' },
      visualization: xyConfig,
    },
  };
}

export class EmbeddedLensExamplePlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies>
{
  public setup(
    core: CoreSetup<StartDependencies>,
    { developerExamples, lens, expressions }: SetupDependencies
  ) {
    core.application.register({
      id: 'third_party_lens_vis_layer_example',
      title: 'Third party Lens vis layer example',
      visibleIn: [],
      mount: ({ history }) => {
        (async () => {
          const [coreStart, { lens: lensStart, dataViews }] = await core.getStartServices();
          // if it's a regular navigation, redirect to Lens
          if (history.action === 'PUSH') {
            const defaultDataView = await dataViews.getDefault();
            const { formula } = await lensStart.stateHelperApi();
            lensStart.navigateToPrefilledEditor({
              id: '',
              timeRange: {
                from: 'now-5d',
                to: 'now',
              },
              attributes: getLensAttributes('green', defaultDataView!, formula),
            });
          } else {
            // if it's a "back" navigation, go to developer examples
            coreStart.application.navigateToApp('developerExamples');
          }
        })();
        return () => {};
      },
    });

    developerExamples.register({
      appId: 'third_party_lens_vis_layer_example',
      title: 'Third party Lens visualization layer',
      description: 'Add custom visualization layer types to the Lens editor',
      image,
      links: [
        {
          label: 'README',
          href: 'https://github.com/elastic/kibana/tree/main/x-pack/examples/third_party_vis_layer_lens_example',
          iconType: 'logoGithub',
          size: 's',
          target: '_blank',
        },
      ],
    });

    lens.registerVisualizationLayer('lnsXY', async () => getXYStaticLayer({ theme: core.theme }));
  }

  public start() {}

  public stop() {}
}
