/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExpressionsSetup } from '@kbn/expressions-plugin/public';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { Plugin, CoreSetup, AppNavLinkStatus } from '@kbn/core/public';
import { DataViewsPublicPluginStart, DataView } from '@kbn/data-views-plugin/public';
import { LensPublicSetup, LensPublicStart } from '@kbn/lens-plugin/public';
import { DeveloperExamplesSetup } from '@kbn/developer-examples-plugin/public';
import { TypedLensByValueInput, PersistedIndexPatternLayer } from '@kbn/lens-plugin/public';
import { getRotatingNumberRenderer, rotatingNumberFunction } from './expression';
import { getRotatingNumberVisualization } from './visualization';
import { RotatingNumberState } from '../common/types';
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

function getLensAttributes(defaultDataView: DataView): TypedLensByValueInput['attributes'] {
  const dataLayer: PersistedIndexPatternLayer = {
    columnOrder: ['col1'],
    columns: {
      col1: {
        dataType: 'number',
        isBucketed: false,
        label: 'Count of records',
        operationType: 'count',
        scale: 'ratio',
        sourceField: '___records___',
      },
    },
  };

  const rotatingNumberConfig: RotatingNumberState = {
    accessor: 'col1',
    color: '#ff0000',
    layerId: 'layer1',
  };

  return {
    visualizationType: 'rotatingNumber',
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
      visualization: rotatingNumberConfig,
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
      id: 'third_party_lens_vis_example',
      title: 'Third party Lens vis example',
      navLinkStatus: AppNavLinkStatus.hidden,
      mount: ({ history }) => {
        (async () => {
          const [coreStart, { lens: lensStart, dataViews }] = await core.getStartServices();
          // if it's a regular navigation, redirect to Lens
          if (history.action === 'PUSH') {
            const defaultDataView = await dataViews.getDefault();
            lensStart.navigateToPrefilledEditor({
              id: '',
              timeRange: {
                from: 'now-5d',
                to: 'now',
              },
              attributes: getLensAttributes(defaultDataView!),
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
      appId: 'third_party_lens_vis_example',
      title: 'Third party Lens visualization',
      description: 'Add custom visualization types to the Lens editor',
      image,
      links: [
        {
          label: 'README',
          href: 'https://github.com/elastic/kibana/tree/main/x-pack/examples/third_party_vis_lens_example',
          iconType: 'logoGithub',
          size: 's',
          target: '_blank',
        },
      ],
    });

    expressions.registerRenderer(() =>
      getRotatingNumberRenderer(
        core.getStartServices().then(([, { fieldFormats }]) => fieldFormats.deserialize)
      )
    );
    expressions.registerFunction(() => rotatingNumberFunction);

    lens.registerVisualization(async () => getRotatingNumberVisualization({ theme: core.theme }));
  }

  public start() {}

  public stop() {}
}
