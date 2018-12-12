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

import _ from 'lodash';
import { toastNotifications } from 'ui/notify';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';

export const defaultLayerLoadWarning = _.once(() => {
  toastNotifications.addDanger({
    title: 'Unable to reach configured basemap layer',
    text: (
      <p>
        <FormattedMessage
          id="common.ui.vis.map.serviceSettings.emsManifestUnavailable"
          defaultMessage="We are unable to reach your configured base
          layer map. Please check your network settings and work with
          your administrator to ensure the configuration is correct or
          use the { defaultSettings } to enable the officially supported
          { EMS }."
          values={{
            defaultSettings: (
              <a
                target="_blank"
                href="https://www.elastic.co/guide/en/kibana/current/settings.html"
              >
                {'default settings'}
              </a>
            ),
            EMS: (
              <a
                target="_blank"
                href="https://www.elastic.co/elastic-maps-service"
              >
                {'Elastic Map Service'}
              </a>
            )
          }}
        />
      </p>
    )
  });
});