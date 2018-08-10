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

import chrome from '../../chrome';
import url from 'url';

export function UrlShortenerProvider(Notifier, $http) {
  const notify = new Notifier({
    location: 'Url Shortener'
  });

  function shortenUrl(absoluteUrl) {
    const basePath = chrome.getBasePath();

    const parsedUrl = url.parse(absoluteUrl);
    const path = parsedUrl.path.replace(basePath, '');
    const hash = parsedUrl.hash ? parsedUrl.hash : '';
    const relativeUrl = path + hash;

    const formData = { url: relativeUrl };

    return $http.post(`${basePath}/shorten`, formData).then((result) => {
      return url.format({
        protocol: parsedUrl.protocol,
        host: parsedUrl.host,
        pathname: `${basePath}/goto/${result.data}`
      });
    }).catch((response) => {
      notify.error(response);
    });
  }

  return {
    shortenUrl
  };
}
