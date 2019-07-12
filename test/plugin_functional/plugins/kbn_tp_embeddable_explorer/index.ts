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

import { Legacy } from 'kibana';

// eslint-disable-next-line import/no-default-export
export default function(kibana: any) {
  return new kibana.Plugin({
    require: ['kibana'],
    uiExports: {
      app: {
        title: 'Embeddable Explorer',
        order: 1,
        main: 'plugins/kbn_tp_embeddable_explorer',
      },
      embeddableActions: [
        'plugins/embeddable_api/test_samples/actions/hello_world_action',
        'plugins/embeddable_api/test_samples/actions/say_hello_action',
        'plugins/embeddable_api/test_samples/actions/send_message_action',
      ],
      embeddableFactories: [
        'plugins/embeddable_api/test_samples/embeddables/hello_world/hello_world_embeddable_factory',
        'plugins/embeddable_api/test_samples/embeddables/contact_card/contact_card_embeddable_factory',
      ],
    },
    init(server: Legacy.Server) {
      server.injectUiAppVars('kbn_tp_embeddable_explorer', async () =>
        server.getInjectedUiAppVars('kibana')
      );
    },
  });
}
