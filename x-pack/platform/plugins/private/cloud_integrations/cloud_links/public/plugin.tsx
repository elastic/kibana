/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { CloudSetup, CloudStart } from '@kbn/cloud-plugin/public';
import type { SecurityPluginSetup, SecurityPluginStart } from '@kbn/security-plugin/public';
import type { GuidedOnboardingPluginStart } from '@kbn/guided-onboarding-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import * as connectionDetails from '@kbn/cloud/connection_details';
import { maybeAddCloudLinks } from './maybe_add_cloud_links';

interface CloudLinksDepsSetup {
  cloud?: CloudSetup;
  security?: SecurityPluginSetup;
}

interface CloudLinksDepsStart {
  cloud?: CloudStart;
  security?: SecurityPluginStart;
  share: SharePluginStart;
  guidedOnboarding?: GuidedOnboardingPluginStart;
}

export class CloudLinksPlugin
  implements Plugin<void, void, CloudLinksDepsSetup, CloudLinksDepsStart>
{
  public setup({ analytics }: CoreSetup) {
    analytics.registerEventType({
      eventType: 'connection_details_learn_more_clicked',
      schema: {},
    });
    analytics.registerEventType({
      eventType: 'connection_details_tab_switched',
      schema: {
        tab: {
          type: 'keyword',
          _meta: {
            description: 'Connection details tab that was switched to.',
            optional: false,
          },
        },
      },
    });
    analytics.registerEventType({
      eventType: 'connection_details_copy_endpoint_url_clicked',
      schema: {},
    });
    analytics.registerEventType({
      eventType: 'connection_details_show_cloud_id_toggled',
      schema: {},
    });
    analytics.registerEventType({
      eventType: 'connection_details_copy_cloud_id_clicked',
      schema: {},
    });
    analytics.registerEventType({
      eventType: 'connection_details_new_api_key_created',
      schema: {},
    });
    analytics.registerEventType({
      eventType: 'connection_details_manage_api_keys_clicked',
      schema: {},
    });
    analytics.registerEventType({
      eventType: 'connection_details_key_encoding_changed',
      schema: {
        format: {
          type: 'keyword',
          _meta: {
            description: 'The format of the API key that was changed to.',
            optional: false,
          },
        },
      },
    });
    analytics.registerEventType({
      eventType: 'connection_details_copy_api_key_clicked',
      schema: {
        format: {
          type: 'keyword',
          _meta: {
            description: 'The format of the API key that was copied.',
            optional: false,
          },
        },
      },
    });
  }

  public start(core: CoreStart, plugins: CloudLinksDepsStart) {
    const { cloud, security, guidedOnboarding, share } = plugins;

    if (cloud?.isCloudEnabled && !core.http.anonymousPaths.isAnonymous(window.location.pathname)) {
      if (guidedOnboarding?.guidedOnboardingApi?.isEnabled) {
        core.chrome.registerGlobalHelpExtensionMenuLink({
          linkType: 'custom',
          href: core.http.basePath.prepend('/app/home#/getting_started'),
          content: (
            <FormattedMessage id="xpack.cloudLinks.setupGuide" defaultMessage="Setup guides" />
          ),
          'data-test-subj': 'cloudOnboardingSetupGuideLink',
          priority: 1000, // We want this link to be at the very top.
        });
      }

      if (security) {
        maybeAddCloudLinks({
          core,
          security,
          cloud,
          share,
        });
      }
    }

    connectionDetails.setGlobalDependencies({
      start: {
        core,
        plugins,
      },
    });
  }

  public stop() {}
}
