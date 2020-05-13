/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { CoreSetup, Plugin } from 'kibana/server';
import { PluginInitializerContext } from 'kibana/public';

export class NewsFeedSimulatorPlugin implements Plugin {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup({ http }: CoreSetup) {
    const router = http.createRouter();
    const version = this.initializerContext.env.packageInfo.version;

    router.get(
      {
        path: `/api/_newsfeed-FTS-external-service-simulators/kibana/v${version}.json`,
        validate: false,
        options: { authRequired: false },
      },
      (context, req, res) => {
        return res.ok({ body: this.mockNewsfeed() });
      }
    );

    router.get(
      {
        path: '/api/_newsfeed-FTS-external-service-simulators/kibana/crash.json',
        validate: false,
        options: { authRequired: false },
      },
      (context, req, res) => {
        return res.internalError({ body: new Error('Internal server error') });
      }
    );
  }

  public start() {}

  private mockNewsfeed() {
    return {
      items: [
        {
          title: { en: `You are functionally testing the newsfeed widget with fixtures!` },
          description: { en: 'See test/common/fixtures/plugins/newsfeed/newsfeed_simulation' },
          link_text: { en: 'Generic feed-viewer could go here' },
          link_url: { en: 'https://feeds.elastic.co' },
          languages: null,
          badge: null,
          image_url: null,
          publish_on: '2019-06-21T00:00:00',
          expire_on: '2040-01-31T00:00:00',
          hash: '39ca7d409c7eb25f4c69a5a6a11309b2f5ced7ca3f9b3a0109517126e0fd91ca',
        },
        {
          title: { en: 'Staging too!' },
          description: { en: 'Hello world' },
          link_text: { en: 'Generic feed-viewer could go here' },
          link_url: { en: 'https://feeds-staging.elastic.co' },
          languages: null,
          badge: null,
          image_url: null,
          publish_on: '2019-06-21T00:00:00',
          expire_on: '2040-01-31T00:00:00',
          hash: 'db445c9443eb50ea2eb15f20edf89cf0f7dac2b058b11cafc2c8c288b6e4ce2a',
        },
        {
          title: { en: 'This item is expired!' },
          description: { en: 'This should not show up.' },
          link_text: { en: 'Generic feed-viewer could go here' },
          link_url: { en: 'https://feeds-staging.elastic.co' },
          languages: null,
          badge: null,
          image_url: null,
          publish_on: '2019-06-21T00:00:00',
          expire_on: '2019-12-31T00:00:00',
          hash: 'db445c9443eb50ea2eb15f20edf89cf0f7dac2b058b11cafc2c8c288b6e4ce2a',
        },
      ],
    };
  }
}
