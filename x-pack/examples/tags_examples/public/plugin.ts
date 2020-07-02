/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Plugin, CoreSetup, CoreStart, AppNavLinkStatus } from '../../../../src/core/public';
import { TagsPluginSetup, TagsPluginStart } from '../../../plugins/tags/public';
import { DeveloperExamplesSetup } from '../../../../examples/developer_examples/public';
import { mount } from './mount';

export interface SetupDependencies {
  tags: TagsPluginSetup;
  developerExamples: DeveloperExamplesSetup;
}

export interface StartDependencies {
  tags: TagsPluginStart;
}

export class TagsExamplesPlugin
  implements Plugin<void, void, SetupDependencies, StartDependencies> {
  public setup(core: CoreSetup<StartDependencies>, { tags, developerExamples }: SetupDependencies) {
    core.application.register({
      id: 'tags-examples',
      title: 'Tags Examples',
      navLinkStatus: AppNavLinkStatus.hidden,
      mount: mount(core),
    });

    developerExamples.register({
      appId: 'tags-examples',
      title: 'Tags',
      description: 'Examples showcasing tags plugin',
      links: [
        {
          label: 'README',
          href: 'https://github.com/elastic/kibana/tree/master/x-pack/plugins/tags',
          iconType: 'logoGithub',
          size: 's',
          target: '_blank',
        },
      ],
    });
  }

  public start(core: CoreStart, plugins: StartDependencies) {}

  public stop() {}
}
