/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, AppNavLinkStatus } from '../../../../src/core/public';
import { DataViewsPublicPluginStart, DataView } from '../../../../src/plugins/data_views/public';
import { LensPublicStart } from '../../../plugins/lens/public';
import { DeveloperExamplesSetup } from '../../../../examples/developer_examples/public';
import {
  TypedLensByValueInput,
  PersistedIndexPatternLayer,
  XYState,
  LensEmbeddableInput,
  DateHistogramIndexPatternColumn,
} from '../../../plugins/lens/public';

export interface SetupDependencies {
  developerExamples: DeveloperExamplesSetup;
}

export interface StartDependencies {
  dataViews: DataViewsPublicPluginStart;
  lens: LensPublicStart;
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
        sourceField: 'Records',
      },
    },
  };

  const rotatingNumberConfig = {
    accessor: 'col1',
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
  public setup(core: CoreSetup<StartDependencies>, { developerExamples }: SetupDependencies) {
    core.application.register({
      id: '3rd_party_lens_vis_example',
      title: '3rd party Lens vis example',
      navLinkStatus: AppNavLinkStatus.hidden,
      mount: (params) => {
        (async () => {
          const [, { lens, dataViews }] = await core.getStartServices();
          const defaultDataView = await dataViews.getDefaultDataView();
          lens.navigateToPrefilledEditor({
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
      appId: '3rd_party_lens_vis_example',
      title: '3rd party Lens visualization',
      description: 'Add custom visualization types to the Lens editor',
      links: [
        {
          label: 'README',
          href: 'https://github.com/elastic/kibana/tree/main/x-pack/examples/3rd_party_lens_vis_example',
          iconType: 'logoGithub',
          size: 's',
          target: '_blank',
        },
      ],
    });
  }

  public start() {}

  public stop() {}
}
